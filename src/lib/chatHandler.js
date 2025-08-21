// lib/chatHandler.js
import OpenAI from 'openai';

export function createChatHandler({ airtableFindOrder, promptLoader }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const MODEL = process.env.OPENAI_MODEL || 'gpt-5';

  // helper: tiny body reader for both express/vercel
  async function readJSON(req) {
    if (req.body) {
      if (typeof req.body === 'string') try { return JSON.parse(req.body); } catch { return {}; }
      return req.body;
    }
    const data = await new Promise((resolve) => {
      let buf = ''; req.on('data', c => buf += c); req.on('end', () => resolve(buf));
    });
    try { return data ? JSON.parse(data) : {}; } catch { return {}; }
  }

  // identifier extraction
  function extractOrderIdentifier(txt) {
    const t = String(txt || '').toLowerCase();
    const email = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (email) return { kind: 'email', value: email[0] };
    const oid = t.match(/\b([a-z]{1,4}-?\d{2,})\b/i);
    if (oid) return { kind: 'orderId', value: oid[1] };
    return null;
  }

  return async function chatHandler(req, res) {
    if (req.method && req.method !== 'POST') {
      res?.setHeader?.('Allow', 'POST');
      return res?.status?.(405)?.json?.({ error: 'Method Not Allowed' });
    }

    const body = await readJSON(req);
    const userText = String(body?.text || '').trim();
    if (!userText) return res.status(400).json({ error: 'missing text' });

    const prompt = await promptLoader(); // loads content/prompt.md text (or '')

    // 1) Order shortcut
    const ident = extractOrderIdentifier(userText);
    if (ident) {
      try {
        const r = await airtableFindOrder(ident);
        if (r?.found) {
          const parts = [
            `סטטוס הזמנה (${r.id}): **${r.status}**`,
            r.updatedAt ? `עודכן לאחרונה: ${r.updatedAt}` : null,
          ].filter(Boolean);
          return res.status(200).json({ reply: parts.join('\n') });
        }
        return res.status(200).json({
          reply: `לא נמצאה הזמנה לפי **${ident.value}**. אפשר לשלוח מספר הזמנה אחר או אימייל ששימש בהזמנה.`
        });
      } catch (e) {
        console.error('order-status error:', e?.message);
        return res.status(200).json({
          reply: `לא הצלחתי לבדוק כרגע את הסטטוס עבור **${ident.value}**. נסו שוב עוד רגע.`
        });
      }
    }

    // 2) Model fallback (mirror language, concise)
    const sys = [
      prompt || '',
      'Rules: Mirror the user’s language (Hebrew/English). Be concise (≤ 4 sentences).',
      'If user provides an order id or email, check status immediately (no confirmation).',
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: sys },
      { role: 'user',   content: userText }
    ];

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        // gpt‑5 does not accept temperature; omit it.
        max_completion_tokens: 450,
        messages
      });
      const msg = completion?.choices?.[0]?.message?.content?.trim() || 'בסדר! איך עוד אפשר לעזור?';
      return res.status(200).json({ reply: msg });
    } catch (e) {
      console.error('openai error:', e?.message);
      return res.status(200).json({ reply: 'מצטערים, הייתה תקלה רגעית. נסו שוב בעוד דקה.' });
    }
  };
}