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
    s = { history: [], ts: now };
    SESSIONS.set(sid, s);
  }
  s.ts = now;
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
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ----- OpenAI -----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const FALLBACK_PROMPT = `
You are Rollupim’s friendly support assistant.
- Mirror the user’s language (Hebrew/English).
- If the user provides an order number, email or phone → call getOrderStatus.
- For general questions → call getKBAnswer(question). If unknown, say so and ask to rephrase.
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
        'Lookup order status in Airtable by orderId, email, or phone (any one is enough). Returns status and doc links if found.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order number (digits/letters as used in Airtable)' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number, preferably including country code' }
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
  if (phone) {
    const normalized = phone.replace(/\s+/g, '');
    clauses.push(`SUBSTITUTE({${F.PHONE}}, ' ', '') = '${normalized.replace(/'/g, "''")}'`);
  }

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


// Heuristic: detect likely order lookups (email/phone/long digits)
function looksLikeOrderQuery(txt) {
  const t = String(txt || '').toLowerCase();
  if (/@/.test(t)) return true;                 // email
  if (/\d{6,}/.test(t)) return true;            // long number (order id)
  if (/\+?\d[\d\s\-()]{6,}/.test(t)) return true; // phone-ish
  return false;
}

// ----- Chat route -----
// Minimal stateless turn: we send system + user; model can call the tool; we respond.
app.post('/api/chat', async (req, res) => {
  const userText = String(req.body?.text || '').trim();

  const t0 = Date.now();
  const sessionId = getOrSetSessionId(req, res);
  const messageId = (req._msgSeq = (req._msgSeq || 0) + 1);

  const sess = getSession(sessionId);

  await logTurn({
    ts: new Date().toISOString(),
    sessionId,
    messageId,
    role: 'user',
    text: redact(userText)
  });


  try {
    // First pass: allow tool calling
    let response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: effectiveSystemPrompt() },
        ...sess.history,
        { role: 'user', content: userText }
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.2
    });

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
        toolResult = await updateAdminTool(args);
      }

      // Second pass: give the tool result so the model can phrase the final answer nicely
      response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: effectiveSystemPrompt() },
          { role: 'user', content: userText },
          msg, // the tool call message
          {
            role: 'tool',
            tool_call_id: call.id,
            name,
            content: JSON.stringify(toolResult)
          }
        ],
        temperature: 0.2
      });
      msg = response.choices[0].message;
    }

    // Return final assistant text
    const finalText = msg.content || 'סליחה, לא הצלחתי להבין. אפשר לנסח שוב?';

    appendToHistory(sess, { role: 'user', content: userText });
    appendToHistory(sess, { role: 'assistant', content: finalText });

    await logTurn({
      ts: new Date().toISOString(),
      sessionId,
      messageId,
      role: 'assistant',
      text: redact(finalText),
      kbHit: false,
      kbTitle: null,
      toolUsed: msg.tool_calls?.[0]?.function?.name || null,
      model: MODEL,
      latencyMs: Date.now() - t0
    });

    return res.json({ reply: finalText });
  } catch (err) {
    console.error('chat error', err);
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

// ----- Start -----
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Support server (assistant mode) on :${port}`));