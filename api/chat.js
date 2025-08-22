// api/chat.js
import fs from 'fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

export const config = { runtime: 'nodejs' };

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

let PROMPT = '';
let LAST_LOAD = 0;
const RELOAD_MS = 60_000; // soft reload every minute

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
  LAST_LOAD = now;
}

// ---------- order identifier extraction ----------
function extractOrderIdentifier(txt) {
  const original = String(txt || '');
  const lower = original.toLowerCase();

  // email (case-insensitive)
  const email = lower.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) return { kind: 'email', value: email[0] };

  // phone (loose)
  const phone = original.match(/\+?\d[\d\s\-()]{6,}/);
  if (phone) return { kind: 'phone', value: phone[0].replace(/\s+/g, '') };

  // order id like R-13 / R 13 / R13 / ABC-123 (preserve letter case as uppercase)
  const m = original.match(/\b([A-Za-z]{1,4})[\s-]?(\d{2,})\b/);
  if (m) {
    const letters = m[1].toUpperCase();
    const digits = m[2];
    const withDash = `${letters}-${digits}`;
    const noDash = `${letters}${digits}`;
    return { kind: 'orderId', value: withDash, variants: [withDash, noDash] };
  }

  // long numeric fallback
  const longNum = original.match(/\b\d{6,}\b/);
  if (longNum) return { kind: 'orderId', value: longNum[0], variants: [longNum[0]] };

  return null;
}

// ---------- Airtable lookup ----------
async function getOrderStatus(ident) {
  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_STATUS_TABLE = 'rollupim',
    AIRTABLE_F_ORDER_ID = 'מספר הזמנה',
    AIRTABLE_F_EMAIL    = 'Email',
    AIRTABLE_F_PHONE    = 'Phone',
    AIRTABLE_F_STATUS   = 'Status',
    AIRTABLE_F_LAST_UPDATE = 'עדכון אחרון',
    AIRTABLE_F_INVOICE_URL = 'חשבונית',
    AIRTABLE_F_DELIVERY_URL = 'BILL',
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { found: false, id: ident.value, note: 'Airtable env not configured' };
  }

  // Build formula by identifier kind
  let formula;
  if (ident.kind === 'email') {
    formula = `LOWER({${AIRTABLE_F_EMAIL}}) = LOWER("${ident.value}")`;
  } else if (ident.kind === 'phone') {
    const normPhone = ident.value.replace(/[^\d+]/g, '');
    formula = `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE({${AIRTABLE_F_PHONE}}," ",""),"-",""),"(",""),")","") = "${normPhone}"`;
  } else {
    // orderId (case-insensitive; support dashed and non-dashed variants)
    const variants = Array.isArray(ident.variants) && ident.variants.length ? ident.variants : [ident.value];
    const ors = variants.map(v => `LOWER({${AIRTABLE_F_ORDER_ID}}) = LOWER("${v.replace(/"/g, '\\"')}")`);
    formula = ors.length === 1 ? ors[0] : `OR(${ors.join(',')})`;
  }

  const url = `https://api.airtable.com/v0/${encodeURIComponent(AIRTABLE_BASE_ID)}/${encodeURIComponent(AIRTABLE_STATUS_TABLE)}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!r.ok) {
    const txt = await r.text().catch(()=>'');
    console.error('[airtable] HTTP', r.status, txt?.slice?.(0, 200) || txt);
    throw new Error(`Airtable ${r.status}: ${txt}`);
  }
  const data = await r.json();
  const rec = Array.isArray(data.records) && data.records[0];
  if (!rec) return { found: false, id: ident.value };
  const f = rec.fields || {};
  return {
    found: true,
    id: ident.value,
    status: f[AIRTABLE_F_STATUS] || 'לא צוין',
    updatedAt: f[AIRTABLE_F_LAST_UPDATE] || null,
    invoiceUrl: f[AIRTABLE_F_INVOICE_URL] || null,
    deliveryUrl: f[AIRTABLE_F_DELIVERY_URL] || null,
    raw: { id: rec.id }
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

  // 1) If identifier provided, check order status immediately (no confirmation)
  const ident = extractOrderIdentifier(userText);
  if (ident) {
    try {
      const r = await getOrderStatus(ident);
      if (r.found) {
        const parts = [];
        parts.push(`סטטוס הזמנה (${r.id}): **${r.status}**`);
        if (r.updatedAt) parts.push(`עודכן לאחרונה: ${r.updatedAt}`);
        return res.status(200).json({ reply: parts.join('\n') });
      }
      return res.status(200).json({
        reply: `קיבלתי את המזהה **${r.id || ident.value}**. לא נמצאה הזמנה במערכת לפי הפרט שסיפקת. אפשר לשלוח מייל/טלפון או לוודא את מספר ההזמנה.`,
      });
    } catch (e) {
      console.error('order-status error:', e?.message);
      return res.status(200).json({
        reply: `לא הצלחתי לבדוק כרגע את הסטטוס עבור **${ident.value}**. נסו שוב עוד רגע, או שלחו לנו הודעה קצרה ונבדוק ידנית.`
      });
    }
  }

  // 2) Model fallback (concise, mirror language)
  const sys = [
    PROMPT ? PROMPT : '',
    'Rules: Mirror the user’s language (Hebrew/English). Be concise (≤ 4 sentences).',
    'If user asks for factual business details (prices, production times, delivery, warranty), answer directly using known facts.',
    'If user provides an order id, email, or phone, check the order status immediately (no confirmation).',
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