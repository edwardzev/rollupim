// support-chat-server.js — OpenAI-driven assistant + Airtable tool
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Airtable from 'airtable';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

// --- JSONL rotating logger ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, 'logs');

async function ensureLogDir() {
  try { await fs.mkdir(LOG_DIR, { recursive: true }); } catch {}
}
function logFileForToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `chat-${yyyy}-${mm}-${dd}.jsonl`);
}
async function logTurn(obj) {
  try {
    await ensureLogDir();
    await fs.appendFile(logFileForToday(), JSON.stringify(obj) + '\n', 'utf8');
  } catch (e) {
    console.warn('[log] append failed:', e.message);
  }
}

// --- Ephemeral session memory (per sid cookie) ---
const SESSIONS = new Map(); // sid -> { history: Array<{role,content}>, ts: number }
const MAX_TURNS = 10;       // keep last 10 turns (~20 messages)
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSession(sid) {
  const now = Date.now();
  // prune expired sessions
  for (const [k, v] of SESSIONS) {
    if (!v || (now - (v.ts || 0)) > SESSION_TTL_MS) SESSIONS.delete(k);
  }
  let s = SESSIONS.get(sid);
  if (!s) {
    s = { history: [], ts: now, escalation: null, firstTurn: true };
    SESSIONS.set(sid, s);
  }
  s.ts = now;
  if (!('escalation' in s)) {
    s.escalation = null;
  }
  return s;
}

function appendToHistory(s, entry) {
  if (!s || !entry) return;
  s.history.push(entry);
  // cap history to last MAX_TURNS user+assistant exchanges (~2 * MAX_TURNS messages)
  const maxMsgs = MAX_TURNS * 2;
  if (s.history.length > maxMsgs) s.history.splice(0, s.history.length - maxMsgs);
  s.ts = Date.now();
}

// --- Escalation helpers ---
function extractPhone(text='') {
  const t = String(text);
  const m = t.match(/(?:\+972[-\s]?|0)(?:[2-9]|5\d)[-\s]?\d{7,8}/);
  return m ? m[0].replace(/[^\d+]/g, '') : '';
}
function extractName(text='') {
  const t = String(text).trim();
  // Heuristic: 2+ letters, not just digits
  if (/^[\p{L}.'\-\s]{2,}$/u.test(t) && !/\d/.test(t)) {
    return t.split(/\s+/).slice(0,3).join(' ');
  }
  return '';
}
function extractQuestion(text='') {
  const t = String(text).trim();
  return t.length >= 4 ? t : '';
}


// cookies + redaction
function parseCookies(str='') {
  return Object.fromEntries(
    str.split(';').map(s => s.trim()).filter(Boolean).map(kv => {
      const i = kv.indexOf('=');
      return i === -1 ? [kv, ''] : [kv.slice(0,i), decodeURIComponent(kv.slice(i+1))];
    })
  );
}
function getOrSetSessionId(req, res) {
  const cookies = parseCookies(req.headers.cookie || '');
  let sid = cookies.sid;
  if (!sid) {
    sid = crypto.randomUUID();
    res.setHeader('Set-Cookie', `sid=${sid}; Path=/; Max-Age=15552000; SameSite=Lax`);
  }
  return sid;
}
function mask(s) { return s.length <= 4 ? '*'.repeat(s.length) : s.slice(0,2) + '***' + s.slice(-2); }
function redact(text='') {
  let t = String(text);
  t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, m => mask(m)); // email
  t = t.replace(/\+?\d[\d\s\-()]{6,}/g, m => mask(m));                    // phone-ish
  t = t.replace(/\b\d{6,}\b/g, m => mask(m));                              // long numbers
  return t;
}

// optional: purge logs older than 120 days at boot
async function purgeOldLogs(days = 120) {
  try {
    await ensureLogDir();
    const files = await fs.readdir(LOG_DIR);
    const cutoff = Date.now() - days * 86400000;
    for (const f of files) {
      if (!f.startsWith('chat-')) continue;
      const p = path.join(LOG_DIR, f);
      const st = await fs.stat(p);
      if (st.mtimeMs < cutoff) await fs.unlink(p);
    }
  } catch {}
}
purgeOldLogs();


let SYSTEM_PROMPT_FILE = '';
async function loadPromptFile() {
  try {
    const p = path.join(__dirname, 'content', 'prompt.md');
    const txt = await fs.readFile(p, 'utf8');
    SYSTEM_PROMPT_FILE = String(txt || '').trim();
    console.log(`[prompt] loaded ${SYSTEM_PROMPT_FILE.length} chars from content/prompt.md`);
  } catch (e) {
    console.warn('[prompt] could not read content/prompt.md — using fallback prompt');
    SYSTEM_PROMPT_FILE = '';
  }
}

// initial load + optional periodic refresh (no top-level await)
loadPromptFile(); // fire-and-forget
setInterval(loadPromptFile, 5 * 60 * 1000);


const app = express();
// CORS — allow dev UI and Vercel, and send credentials
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://127.0.0.1:5173',
];
// allow any *.vercel.app
const vercelRe = /\.vercel\.app$/;

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman or same-origin
    if (allowedOrigins.includes(origin) || vercelRe.test(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
   if (req.method === 'OPTIONS') {
     const origin = req.headers.origin || '';
     res.header('Access-Control-Allow-Origin', origin);
     res.header('Vary', 'Origin');
     res.header('Access-Control-Allow-Credentials', 'true');
     res.header('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
     return res.sendStatus(204);
   }
   next();
 });
app.use(express.json({ limit: '2mb' }));

// ----- OpenAI -----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5';

// Defensive sanitizer: remove any accidental temperature field
function sanitizeOpenAIParams(p) {
  const o = { ...p };
  if ('temperature' in o) delete o.temperature;
  return o;
}

// Strict wrapper: logs and strips temperature always
async function chatCreate(params) {
  if (params && Object.prototype.hasOwnProperty.call(params, 'temperature')) {
    console.warn('[openai] stripping temperature from params:', params.temperature);
  }
  const clean = sanitizeOpenAIParams(params || {});
  return openai.chat.completions.create(clean);
}

const FALLBACK_PROMPT = `
You are Rollupim’s friendly support assistant.
- Mirror the user’s language (Hebrew/English).
- If the user provides an order number or email → call getOrderStatus.
- For escalation to a human representative, use updateAdmin if relevant.
- If you do not know the answer to a question, politely admit you don't know.
- Be concise, warm, and avoid making up facts.
`.trim();

function effectiveSystemPrompt() {
  return SYSTEM_PROMPT_FILE || FALLBACK_PROMPT;
}

// Tool schema the model can call
const tools = [
  {
    type: 'function',
    function: {
      name: 'getOrderStatus',
      description:
        'Lookup order status in Airtable by orderId or email (one is enough). Returns status and doc links if found.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order number (digits/letters as used in Airtable)' },
          email: { type: 'string', description: 'Email address' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateAdmin',
      description: 'Notify admin via WhatsApp about an escalation from a customer.',
      parameters: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Customer name (if known)' },
          phone:   { type: 'string', description: 'Customer phone number (preferably with country code)' },
          question:{ type: 'string', description: 'Short description of the issue / question' }
        },
        required: ['phone', 'question'],
        additionalProperties: false
      }
    }
  }
];

// ----- Airtable -----
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);
const STATUS_TABLE = process.env.AIRTABLE_STATUS_TABLE || 'Full View';

const F = {
  ORDER_ID: process.env.AIRTABLE_F_ORDER_ID || 'Order ID',
  EMAIL: process.env.AIRTABLE_F_EMAIL || 'Email',
  PHONE: process.env.AIRTABLE_F_PHONE || 'Phone',
  STATUS: process.env.AIRTABLE_F_STATUS || 'Status',
  LAST_UPDATE: process.env.AIRTABLE_F_LAST_UPDATE || 'Last Update',
  INVOICE_URL: process.env.AIRTABLE_F_INVOICE_URL || 'Invoice URL',
  DELIVERY_URL: process.env.AIRTABLE_F_DELIVERY_URL || 'Delivery Cert URL'
};


async function findOrder({ orderId, email, phone }) {
  const clauses = [];
  if (orderId) clauses.push(`{${F.ORDER_ID}} = '${orderId.replace(/'/g, "''")}'`);
  if (email) clauses.push(`LOWER({${F.EMAIL}}) = '${email.toLowerCase().replace(/'/g, "''")}'`);

  if (!clauses.length) return null;

  const filterByFormula = clauses.join(' OR ');
  const recs = await base(STATUS_TABLE).select({ maxRecords: 5, filterByFormula }).all();
  if (!recs.length) return null;

  const r = recs[0];
  return {
    orderId: r.get(F.ORDER_ID) || r.id,
    status: r.get(F.STATUS) || 'Unknown',
    lastUpdate: r.get(F.LAST_UPDATE) || null,
    invoiceUrl: r.get(F.INVOICE_URL) || null,
    deliveryCertUrl: r.get(F.DELIVERY_URL) || null
  };
}

// Tool implementation the server will run if the model calls it
async function getOrderStatusTool(args = {}) {
  const result = await findOrder(args);
  if (!result) return { found: false };
  return { found: true, ...result };
}

// --- Admin escalation tool (WhatsApp via HTTP) ---
async function updateAdminTool(args = {}) {
  const name = (args.name || '').toString().trim();
  const phone = (args.phone || '').toString().trim();
  const question = (args.question || '').toString().trim();
  if (!phone || !question) return { success: false, error: 'phone and question are required' };

  const adminTo = (process.env.WHAPI_ADMIN_TO || '').trim();
  const apiKey  = (process.env.WHAPI_API_KEY || '').trim();
  const apiUrl  = (process.env.WHAPI_API_URL || 'https://gate.whapi.cloud/messages/text').trim();

  if (!adminTo) return { success: false, error: 'WHAPI_ADMIN_TO not set' };
  if (!apiKey)  return { success: false, error: 'WHAPI_API_KEY not set' };

  const bodyText = `Dear Admin, customer ${name || 'Unknown'} phone ${phone} needs your help relating ${question}`;

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        typing_time: 0,
        to: adminTo,
        body: bodyText
      })
    });

    const text = await resp.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!resp.ok) {
      console.error('[updateAdmin] HTTP', resp.status, text);
      return { success: false, status: resp.status, error: data?.error || text || 'HTTP error' };
    }

    return { success: true, sentTo: adminTo, body: bodyText, provider: 'whapi', response: data };
  } catch (err) {
    console.error('[updateAdmin] fetch failed:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}



// ----- Chat route -----
// Minimal stateless turn: we send system + user; model can call the tool; we respond.
app.post('/api/chat', async (req, res) => {
  const userText = String(req.body?.text || '').trim();

  const t0 = Date.now();
  const sessionId = getOrSetSessionId(req, res);
  const messageId = (req._msgSeq = (req._msgSeq || 0) + 1);

  const sess = getSession(sessionId);

  // Obvious human/escalation phrasing → start FSM immediately (hybrid trigger)
  const wantsHuman = /(?:\bנציג(?:\s?אנושי)?\b|דבר\s?עם\s?נציג|לתקשר\s?עם\s?מישהו|אדם|human|representative|talk to (?:a|someone)|agent|support human)/i.test(userText);
  if (wantsHuman && !(sess.escalation && sess.escalation.active)) {
    sess.escalation = { active: true, data: { name: '', phone: '', question: '' } };
    const reply = 'בשמחה! איך קוראים לך?';
    appendToHistory(sess, { role: 'user', content: userText });
    appendToHistory(sess, { role: 'assistant', content: reply });
    sess.firstTurn = false;
    await logTurn({ ts:new Date().toISOString(), sessionId, messageId, role:'assistant', text:redact(reply), toolUsed:null, model:DEFAULT_MODEL, latencyMs: 0 });
    return res.json({ reply });
  }

  // Track model for this request
  let useModel = DEFAULT_MODEL;

  // --- Escalation state machine (server-driven) ---
  if (sess.escalation && sess.escalation.active) {
    const esc = sess.escalation;
    esc.data = esc.data || { name:'', phone:'', question:'' };

    // Try to fill missing fields from this message
    if (!esc.data.name) {
      const n = extractName(userText);
      if (n) esc.data.name = n;
    }
    if (!esc.data.phone) {
      const p = extractPhone(userText);
      if (p) esc.data.phone = p;
    }
    if (!esc.data.question && (esc.data.name || esc.data.phone)) {
      const q = extractQuestion(userText);
      if (q) esc.data.question = q;
    }

    // Decide next prompt
    if (!esc.data.name) {
      const reply = 'בשמחה! איך קוראים לך?';
      appendToHistory(sess, { role: 'user', content: userText });
      appendToHistory(sess, { role: 'assistant', content: reply });
      sess.firstTurn = false;
      await logTurn({ ts:new Date().toISOString(), sessionId, messageId, role:'assistant', text:redact(reply), toolUsed:null, model:useModel, latencyMs: Date.now() - t0 });
      return res.json({ reply });
    }
    if (!esc.data.phone) {
      const reply = `תודה ${esc.data.name}! מה מספר הטלפון שלך?`;
      appendToHistory(sess, { role: 'user', content: userText });
      appendToHistory(sess, { role: 'assistant', content: reply });
      sess.firstTurn = false;
      await logTurn({ ts:new Date().toISOString(), sessionId, messageId, role:'assistant', text:redact(reply), toolUsed:null, model:useModel, latencyMs: Date.now() - t0 });
      return res.json({ reply });
    }
    if (!esc.data.question) {
      const reply = 'קיבלתי ✔️ מה הנושא או הבעיה בקצרה?';
      appendToHistory(sess, { role: 'user', content: userText });
      appendToHistory(sess, { role: 'assistant', content: reply });
      sess.firstTurn = false;
      await logTurn({ ts:new Date().toISOString(), sessionId, messageId, role:'assistant', text:redact(reply), toolUsed:null, model:useModel, latencyMs: Date.now() - t0 });
      return res.json({ reply });
    }

    // We have all three — call updateAdmin
    const toolResult = await updateAdminTool({
      name: esc.data.name,
      phone: esc.data.phone,
      question: esc.data.question
    });

    // Reset escalation regardless of success
    sess.escalation = null;

    const reply = toolResult.success
      ? 'הפרטים הועברו לנציג 👩‍💼 נחזור אליך בהקדם. תודה!'
      : `לא הצלחתי להעביר כרגע לנציג: ${toolResult.error || 'שגיאה'}. אפשר לנסות שוב או להשאיר פרטים כאן.`;

    appendToHistory(sess, { role: 'user', content: userText });
    appendToHistory(sess, { role: 'assistant', content: reply });
    sess.firstTurn = false;
    await logTurn({ ts:new Date().toISOString(), sessionId, messageId, role:'assistant', text:redact(reply), toolUsed:'updateAdmin', model:useModel, latencyMs: Date.now() - t0 });
    return res.json({ reply });
  }

  await logTurn({
    ts: new Date().toISOString(),
    sessionId,
    messageId,
    role: 'user',
    text: redact(userText)
  });

  try {
    // First pass: allow tool calling, with retry-on-model-not-found
    let response;
    // Greeting suppression logic for system prompt
    const systemMsgs = [{ role: 'system', content: effectiveSystemPrompt() }];
    if (!sess.firstTurn) {
      systemMsgs.push({
        role: 'system',
        content:
          'Do not greet again. Do not present a global options/menu unless the user explicitly asks for "options" or "menu". Answer directly and tersely.'
      });
    }
    try {
      response = await chatCreate(
        {
          model: useModel,
          messages: [
            ...systemMsgs,
            ...sess.history,
            { role: 'user', content: userText }
          ],
          tools,
          tool_choice: 'auto',
          max_completion_tokens: 450
        }
      );
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      const status = err?.status || err?.response?.status;
      if (status === 404 || (msg.includes('model') && msg.includes('not') && msg.includes('found'))) {
        console.warn(`[openai] model "${useModel}" not found; falling back to gpt-4o-mini`);
        useModel = 'gpt-4o-mini';
        response = await chatCreate(
          {
            model: useModel,
            messages: [
              ...systemMsgs,
              ...sess.history,
              { role: 'user', content: userText }
            ],
            tools,
            tool_choice: 'auto',
            max_completion_tokens: 450
          }
        );
      } else {
        throw err;
      }
    }

    let msg = response.choices[0].message;

    if (msg.tool_calls?.length) {
      const call = msg.tool_calls[0];
      console.log('[tool-call]', call.function?.name, call.function?.arguments);
    }

    // If model called a tool, run it and send results back to the model for a final, friendly reply
    if (msg.tool_calls?.length) {
      const call = msg.tool_calls[0];
      const name = call.function?.name;
      const args = safeParseJSON(call.function?.arguments);

      let toolResult = {};
      if (name === 'getOrderStatus') {
        toolResult = await getOrderStatusTool(args);
      } else if (name === 'updateAdmin') {
        const needPhone = !args?.phone;
        const needQuestion = !args?.question;
        if (needPhone || needQuestion) {
          // Start/continue escalation FSM to gather missing info
          sess.escalation = { active: true, data: { name: args?.name || '', phone: args?.phone || '', question: args?.question || '' } };
          const prompt = needPhone ? 'מה מספר הטלפון שלך?' : 'מה הנושא או הבעיה בקצרה?';
          appendToHistory(sess, { role: 'user', content: userText });
          appendToHistory(sess, { role: 'assistant', content: prompt });
          sess.firstTurn = false;
          await logTurn({ ts:new Date().toISOString(), sessionId, messageId, role:'assistant', text:redact(prompt), toolUsed:null, model:useModel, latencyMs: Date.now() - t0 });
          return res.json({ reply: prompt });
        }
        toolResult = await updateAdminTool(args);
      }

      // Second pass: give the tool result so the model can phrase the final answer nicely
      const systemMsgs2 = [{ role: 'system', content: effectiveSystemPrompt() }];
      if (!sess.firstTurn) {
        systemMsgs2.push({
          role: 'system',
          content:
            'Do not greet again. Do not present a global options/menu unless the user explicitly asks for "options" or "menu". Answer directly and tersely.'
        });
      }
      response = await chatCreate(
        {
          model: useModel,
          messages: [
            ...systemMsgs2,
            { role: 'user', content: userText },
            msg, // the tool call message
            {
              role: 'tool',
              tool_call_id: call.id,
              name,
              content: JSON.stringify(toolResult)
            }
          ],
          max_completion_tokens: 450
        }
      );
      msg = response.choices[0].message;
    }

    // Return final assistant text
    const finalText = msg.content || 'סליחה, לא הצלחתי להבין. אפשר לנסח שוב?';

    appendToHistory(sess, { role: 'user', content: userText });
    appendToHistory(sess, { role: 'assistant', content: finalText });
    sess.firstTurn = false;

    await logTurn({
      ts: new Date().toISOString(),
      sessionId,
      messageId,
      role: 'assistant',
      text: redact(finalText),
      kbHit: false,
      kbTitle: null,
      toolUsed: msg.tool_calls?.[0]?.function?.name || null,
      model: useModel,
      latencyMs: Date.now() - t0
    });

    return res.json({ reply: finalText });
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const data = err?.response?.data || err?.data;
    console.error('chat error', { status, message: err?.message, data });
    return res.status(500).json({ reply: 'תקלה זמנית. נסו שוב בעוד רגע.' });
  }
});

function safeParseJSON(s) {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

// Health check

app.get('/api/ping', (req, res) => {
  res.type('text/plain').send('pong');
});

// Minimal OpenAI self-test (no tools, no temp)
app.get('/api/debug/openai', async (req, res) => {
  try {
    const r = await chatCreate({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are a test.' },
        { role: 'user', content: 'Say OK.' }
      ]
    });
    const out = r?.choices?.[0]?.message?.content || null;
    res.json({ ok: true, model: DEFAULT_MODEL, reply: out });
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const data = err?.response?.data || err?.data;
    console.error('/api/debug/openai error', { status, message: err?.message, data });
    res.status(500).json({ ok: false, status, message: err?.message, data });
  }
});


app.get('/api/debug/logs', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    const file = logFileForToday();
    const txt = await fs.readFile(file, 'utf8').catch(() => '');
    const lines = txt.trim().split('\n').slice(-limit);
    const items = lines.filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    res.json({ file, count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----- Escalation form route -----
// CORS preflight for escalation form
app.options('/api/escalate', cors(corsOptions));
// Accepts { name, phone, question } and notifies admin via WhatsApp
app.post('/api/escalate', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const question = String(req.body?.question || '').trim();

    if (!phone || !question) {
      return res.status(400).json({ ok: false, error: 'phone and question are required' });
    }

    const result = await updateAdminTool({ name, phone, question });
    // log the escalation attempt (with light masking)
    await logTurn({
      ts: new Date().toISOString(),
      role: 'server',
      event: 'escalate',
      name,
      phone: phone.replace(/.(?=.{2})/g, '•'),
      question: (question || '').slice(0, 160),
      ok: !!result?.success
    });

    if (result.success) {
      return res.json({
        ok: true,
        message: 'הפרטים הועברו לנציג 👩‍💼 נחזור אליך בהקדם.',
        sentTo: result.sentTo || null
      });
    } else {
      // also record failure in log
      await logTurn({
        ts: new Date().toISOString(),
        role: 'server',
        event: 'escalate_error',
        name,
        phone: phone.replace(/.(?=.{2})/g, '•'),
        error: result.error || 'Failed to notify admin'
      });
      return res.status(502).json({
        ok: false,
        error: result.error || 'Failed to notify admin'
      });
    }
  } catch (err) {
    console.error('/api/escalate error', err?.message || err);
    await logTurn({
      ts: new Date().toISOString(),
      role: 'server',
      event: 'escalate_exception',
      error: err?.message || String(err)
    });
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// ----- Start -----
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Support server (assistant mode) on :${port}`);
  console.log('[boot]', { file: __filename, model: DEFAULT_MODEL });
});