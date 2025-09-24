// Vercel serverless: /api/escalate  (no external type imports)

const HOOK =
  'https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTZhMDYzMDA0MzE1MjZhNTUzNTUxMzci_pc';

// Small CORS helper
function setCors(res: any, origin: string) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  const origin = (req.headers?.origin as string) || 'https://rollupim.co.il';
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const question = String(body.question || '').trim();

    if (!phone || !question) {
      res.status(400).json({ ok: false, error: 'phone and question are required' });
      return;
    }

    const payload: Record<string, any> = {
      version: '1.0',
      event: 'human_handshake',
      source: 'bot',
      timestamp: new Date().toISOString(),
      page_url: (req.headers?.referer as string) || '',

      id: '',
      order_hint: '',
      is_assist: false,
      is_bulk: false,

      customer: { name, phone, email: '', address: '', city: '' },
      bulk_quantity: 0,
      computed_units: 0,
      total: 0,

      products: [],
      addons: [],

      file_urls: '',
      dropbox_urls: '',

      uploads: {},

      analysis: {
        primary: { ratio: '', resolution: '' },
        assist:  { ratio: '', resolution: '' }
      },

      notes: question,
      chat_context: ''
    };

    // x-www-form-urlencoded for Pabbly
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(payload)) {
      form.append(k, (v && typeof v === 'object') ? JSON.stringify(v) : String(v ?? ''));
    }

    const resp = await fetch(HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const text = await resp.text();
    if (!resp.ok) {
      res.status(502).json({ ok: false, error: 'failed_to_forward', details: text });
      return;
    }

    res.json({ ok: true, message: 'הפרטים נשלחו. נחזור אליך בהקדם.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
}