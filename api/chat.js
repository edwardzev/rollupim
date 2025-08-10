// api/chat.js
import fs from 'fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

export const config = { runtime: 'nodejs' }; // ensure Node runtime on Vercel
// ---------- body parsing helper for Node runtime ----------
async function readJSON(req) {
  // If the framework has already parsed the body:
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    return req.body;
  }
  // Otherwise, read the raw stream:
  const data = await new Promise((resolve) => {
    let buf = '';
    req.on('data', (chunk) => { buf += chunk; });
    req.on('end', () => resolve(buf));
  });
  try { return data ? JSON.parse(data) : {}; } catch { return {}; }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ---------- file helpers (Vercel: read-only, OK) ----------
const ROOT = process.cwd();
const P_PROMPT   = [path.join(ROOT, 'content', 'prompt.md')];
const P_KB       = [path.join(ROOT, 'content', 'kb.json')];
const P_SYNONYMS = [path.join(ROOT, 'content', 'synonyms.json')];

let PROMPT = '';
let KB = [];
let SYNS = {};
let LAST_LOAD = 0;
const RELOAD_MS = 60_000; // soft reload every minute

async function tryReadJSON(paths) {
  for (const p of paths) {
    try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch {}
  }
  return null;
}
async function tryReadText(paths) {
  for (const p of paths) {
    try { return await fs.readFile(p, 'utf8'); } catch {}
  }
  return '';
}
async function ensureLoaded() {
  const now = Date.now();
  if (now - LAST_LOAD < RELOAD_MS) return;
  PROMPT = (await tryReadText(P_PROMPT)) || '';
  KB = (await tryReadJSON(P_KB)) || [];
  SYNS = (await tryReadJSON(P_SYNONYMS)) || {};
  LAST_LOAD = now;
}

// ---------- KB matching with synonyms ----------
const s = (x) => String(x || '').toLowerCase();
function scoreKB(q, item) {
  const Q = s(q);
  const hay = [s(item.title || item.q), s(item.answer || item.a), s((item.tags || []).join(' '))].join(' ');
  if (!Q || !hay) return 0;

  // expand tokens using SYNS
  const tokens = Q.split(/\s+/).filter(Boolean);
  const expanded = new Set(tokens);
  for (const t of tokens) {
    for (const [canon, syns] of Object.entries(SYNS)) {
      const canonL = s(canon);
      const list = Array.isArray(syns) ? syns.map(s) : [];
      if (t === canonL || list.includes(t)) {
        expanded.add(canonL);
        for (const v of list) expanded.add(v);
      }
    }
  }

  let sc = 0;
  if (hay.includes(Q)) sc += 3;
  for (const w of expanded) {
    if (w.length >= 3 && hay.includes(w)) sc += 1;
  }
  return sc;
}
function looksLikeOrderQuery(txt) {
  const t = s(txt);
  if (/@/.test(t)) return true;
  if (/\d{6,}/.test(t)) return true;
  if (/\+?\d[\d\s\-()]{6,}/.test(t)) return true;
  return false;
}
async function getKBAnswer(question) {
  if (!KB.length) return { found: false };
  let best = null, bestScore = 0;
  for (const item of KB) {
    const sc = scoreKB(question, item);
    if (sc > bestScore) { bestScore = sc; best = item; }
  }
  if (bestScore === 0) return { found: false };
  return {
    found: true,
    best: {
      title: best.title || best.q || '',
      answer: best.answer || best.a || ''
    },
    score: bestScore
  };
}

// ---------- main handler ----------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = await readJSON(req);

  const userText = String(body?.text || '').trim();
  if (!userText) return res.status(400).json({ error: 'missing text' });

  await ensureLoaded();

  // 1) Fast KB pre-check (skip model when possible)
  if (!looksLikeOrderQuery(userText)) {
    const kbHit = await getKBAnswer(userText);
    if (kbHit?.found && kbHit.best?.answer) {
      return res.status(200).json({ reply: kbHit.best.answer });
    }
  }

  // 2) Model fallback (concise, mirror language)
  const sys = [
    PROMPT ? PROMPT : '',
    'Rules: Mirror the user’s language (Hebrew/English). Be concise (≤ 4 sentences).',
    'If user asks for factual business details (prices, production times, delivery, warranty), answer directly using known facts.',
    'If user provides order id/email/phone, ask permission to check and explain what you’ll do.',
  ].filter(Boolean).join('\n\n');

  const messages = [
    { role: 'system', content: sys },
    { role: 'user',   content: userText }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages
    });
    const msg = completion?.choices?.[0]?.message?.content?.trim() || 'בסדר! איך עוד אפשר לעזור?';
    return res.status(200).json({ reply: msg });
  } catch (e) {
    console.error('openai error:', e?.message);
    return res.status(200).json({ reply: 'מצטערים, הייתה תקלה רגעית. נסו שוב בעוד דקה.' });
  }
}