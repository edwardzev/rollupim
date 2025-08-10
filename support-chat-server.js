// support-chat-server.js — OpenAI-driven assistant + Airtable tool
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Airtable from 'airtable';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// --- KB in-memory store + loader ---
let KB = [];
let KB_DEBUG = { tried: [], used: null, error: null };
async function loadKBFile() {
  const candidates = [
    path.join(__dirname, 'content', 'kb.json'),
    path.resolve(process.cwd(), 'content', 'kb.json'),
  ];
  KB_DEBUG.tried = candidates;
  KB_DEBUG.used = null;
  KB_DEBUG.error = null;

  for (const p of candidates) {
    try {
      await fs.access(p);
      const raw = await fs.readFile(p, 'utf8');
      KB = JSON.parse(raw);
      KB_DEBUG.used = p;
      console.log(`[kb] loaded ${KB.length} entries from ${p}`);
      return;
    } catch (e) {
      KB_DEBUG.error = e?.message || String(e);
      // try next candidate
    }
  }

  // if all candidates failed
  KB = [];
  console.warn(`[kb] could not read kb.json — tried: ${candidates.join(' , ')}`);
}
// initial load + periodic refresh
loadKBFile();
setInterval(loadKBFile, 5 * 60 * 1000);

// --- KB hits in-memory store + loader ---
let KB_HITS = {};
let KB_HITS_DEBUG = { tried: [], used: null, error: null, saveError: null };
async function loadKBHitsFile() {
  const candidates = [
    path.join(__dirname, 'content', 'kb_hits.json'),
    path.resolve(process.cwd(), 'content', 'kb_hits.json'),
  ];
  KB_HITS_DEBUG.tried = candidates;
  KB_HITS_DEBUG.used = null;
  KB_HITS_DEBUG.error = null;
  KB_HITS_DEBUG.saveError = null;

  for (const p of candidates) {
    try {
      await fs.access(p);
      const raw = await fs.readFile(p, 'utf8');
      KB_HITS = JSON.parse(raw);
      KB_HITS_DEBUG.used = p;
      console.log(`[kb-hits] loaded hit counts from ${p}`);
      return;
    } catch (e) {
      KB_HITS_DEBUG.error = e?.message || String(e);
      // try next candidate
    }
  }

  // if all candidates failed
  KB_HITS = {};
  console.warn(`[kb-hits] could not read kb_hits.json — tried: ${candidates.join(' , ')}`);
}
async function saveKBHits() {
  if (!KB_HITS_DEBUG.used) return;
  try {
    await fs.writeFile(KB_HITS_DEBUG.used, JSON.stringify(KB_HITS, null, 2), 'utf8');
    KB_HITS_DEBUG.saveError = null;
  } catch (e) {
    KB_HITS_DEBUG.saveError = e?.message || String(e);
    console.warn(`[kb-hits] failed to save kb_hits.json: ${KB_HITS_DEBUG.saveError}`);
  }
}
// initial load + periodic refresh
loadKBHitsFile();
setInterval(loadKBHitsFile, 5 * 60 * 1000);

// --- Synonyms in-memory store + loader ---
let SYNS = {};
let SYN_DEBUG = { tried: [], used: null, error: null };
async function loadSynonymsFile() {
  const candidates = [
    path.join(__dirname, 'content', 'synonyms.json'),
    path.resolve(process.cwd(), 'content', 'synonyms.json'),
  ];
  SYN_DEBUG.tried = candidates;
  SYN_DEBUG.used = null;
  SYN_DEBUG.error = null;

  for (const p of candidates) {
    try {
      await fs.access(p);
      const raw = await fs.readFile(p, 'utf8');
      SYNS = JSON.parse(raw);
      SYN_DEBUG.used = p;
      console.log(`[syn] loaded ${Object.keys(SYNS).length} groups from ${p}`);
      return;
    } catch (e) {
      SYN_DEBUG.error = e?.message || String(e);
      // try next candidate
    }
  }

  // if all candidates failed
  SYNS = {};
  console.warn(`[syn] could not read synonyms.json — tried: ${candidates.join(' , ')}`);
}
// initial load + periodic refresh
loadSynonymsFile();
setInterval(loadSynonymsFile, 5 * 60 * 1000);

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
      name: 'getKBAnswer',
      description: 'Answer general business questions from the local KB file (content/kb.json).',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'User question in free text' }
        },
        required: ['question'],
        additionalProperties: false
      }
    }
  },
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

// --- Simple KB scoring + tool ---
function scoreKB(q, item) {
  const s = (x) => String(x || '').toLowerCase();
  const Q = s(q);
  const hay = [s(item.title), s(item.answer), s((item.tags || []).join(' '))].join(' ');
  if (!Q || !hay) return 0;

  // Expand query tokens with synonyms from SYNS
  const tokens = Q.split(/\s+/).filter(Boolean);
  const expanded = new Set(tokens);
  for (const t of tokens) {
    for (const [canon, syns] of Object.entries(SYNS)) {
      const canonL = s(canon);
      const synList = Array.isArray(syns) ? syns.map(s) : [];
      if (t === canonL || synList.includes(t)) {
        expanded.add(canonL);
        for (const u of synList) expanded.add(u);
      }
    }
  }

  let sc = 0;
  // whole-phrase hit
  if (hay.includes(Q)) sc += 3;

  // token/syn hits
  for (const w of expanded) {
    if (w.length >= 3 && hay.includes(w)) sc += 1;
  }
  return sc;
}
async function getKBAnswerTool(args = {}) {
  const question = String(args.question || '').trim();
  if (!question || !Array.isArray(KB) || KB.length === 0) return { found: false };
  const ranked = KB
    .map(it => ({ it, sc: scoreKB(question, it) }))
    .filter(x => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 3)
    .map(x => x.it);
  if (!ranked.length) return { found: false };

  // increment hit count for best answer and save
  const title = ranked[0].title || 'unknown';
  KB_HITS[title] = (KB_HITS[title] || 0) + 1;
  await saveKBHits();

  return { found: true, best: ranked[0], alternatives: ranked.slice(1) };
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

  // ---- Fast KB pre-check: if it's not an order lookup, try KB before OpenAI
  try {
    if (!looksLikeOrderQuery(userText)) {
      const kbHit = await getKBAnswerTool({ question: userText });
      if (kbHit?.found && kbHit.best?.answer) {
        // increment hit count for best answer and save (redundant with getKBAnswerTool but keep for safety)
        const title = kbHit.best.title || 'unknown';
        KB_HITS[title] = (KB_HITS[title] || 0) + 1;
        await saveKBHits();

        return res.json({ reply: kbHit.best.answer });
      }
    }
  } catch (e) {
    // swallow and fall through to OpenAI if KB pre-check fails
    console.warn('[kb-precheck] failed', e);
  }

  try {
    // First pass: allow tool calling
    let response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: effectiveSystemPrompt() },
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
      } else if (name === 'getKBAnswer') {
        toolResult = await getKBAnswerTool(args);
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

// Debug KB route
app.get('/api/debug/kb', (req, res) => {
  res.json({
    entries: Array.isArray(KB) ? KB.length : 0,
    tried: KB_DEBUG.tried,
    used: KB_DEBUG.used,
    error: KB_DEBUG.error,
  });
});

// Debug synonyms route
app.get('/api/debug/syn', (req, res) => {
  res.json({
    groups: SYNS && typeof SYNS === 'object' ? Object.keys(SYNS).length : 0,
    tried: SYN_DEBUG.tried,
    used: SYN_DEBUG.used,
    error: SYN_DEBUG.error,
  });
});

// Debug KB hits route
app.get('/api/debug/kb-hits', (req, res) => {
  res.json({
    hits: KB_HITS,
    tried: KB_HITS_DEBUG.tried,
    used: KB_HITS_DEBUG.used,
    loadError: KB_HITS_DEBUG.error,
    saveError: KB_HITS_DEBUG.saveError,
  });
});

// ----- Start -----
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Support server (assistant mode) on :${port}`));