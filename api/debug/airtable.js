// api/debug/airtable.js
export const config = { runtime: 'nodejs22.x' };

export default async function handler(req, res) {
  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_STATUS_TABLE = 'rollupim',
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(200).json({
      ok: false,
      reason: 'missing_env',
      have: {
        AIRTABLE_API_KEY: Boolean(AIRTABLE_API_KEY),
        AIRTABLE_BASE_ID: Boolean(AIRTABLE_BASE_ID),
      },
    });
  }

  try {
    const url =
      `https://api.airtable.com/v0/` +
      `${encodeURIComponent(AIRTABLE_BASE_ID)}/` +
      `${encodeURIComponent(AIRTABLE_STATUS_TABLE)}?maxRecords=1`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* keep raw text */ }

    res.status(200).json({
      ok: r.ok,
      status: r.status,
      table: AIRTABLE_STATUS_TABLE,
      sampleRecordId: json?.records?.[0]?.id || null,
      rawError: r.ok ? null : (json?.error || text.slice(0, 250)),
    });
  } catch (e) {
    console.error('[debug/airtable] error:', e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}