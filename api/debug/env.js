// api/debug/env.js
export const config = { runtime: 'nodejs18.x' }; // be explicit

export default async function handler(req, res) {
  try {
    const tail = (k) => {
      const v = process.env[k];
      if (!v) return null;
      const s = String(v);
      return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
    };

    res.status(200).json({
      ok: true,
      node: process.version,
      model: process.env.OPENAI_MODEL || null,
      has: {
        OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
        AIRTABLE_API_KEY: Boolean(process.env.AIRTABLE_API_KEY),
        AIRTABLE_BASE_ID: Boolean(process.env.AIRTABLE_BASE_ID),
      },
      tails: {
        OPENAI_API_KEY: tail('OPENAI_API_KEY'),
        AIRTABLE_API_KEY: tail('AIRTABLE_API_KEY'),
        AIRTABLE_BASE_ID: tail('AIRTABLE_BASE_ID'),
      },
    });
  } catch (e) {
    console.error('[debug/env] error:', e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}