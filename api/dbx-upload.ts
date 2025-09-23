// REMOVE this line:
// import type { VercelRequest, VercelResponse } from '@vercel/node';

// Use an untyped handler:
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const token = process.env.DROPBOX_TOKEN;
    if (!token) return res.status(500).json({ error: 'Missing DROPBOX_TOKEN' });

    // Busboy (note the import form)
    const { default: Busboy } = await import('busboy');
    const bb = Busboy({ headers: req.headers });

    const fields: Record<string, string> = {};
    const chunks: Buffer[] = [];
    let filename = 'upload.bin';

    await new Promise<void>((resolve, reject) => {
      bb.on('file', (_name, file, info) => {
        filename = info?.filename || filename;
        file.on('data', (d: Buffer) => chunks.push(d));
        file.on('end', () => {});
      });
      bb.on('field', (name, val) => (fields[name] = String(val || '')));
      bb.on('close', resolve);
      bb.on('error', reject);
      req.pipe(bb);
    });

    const fileBuf = Buffer.concat(chunks);
    if (!fileBuf.length) return res.status(400).json({ error: 'No file' });

    const client = (fields.client || 'client').trim();
    const base = 'Dropbox/Print Market Team Folder/rollupim';
    const folder = (fields.path || '/orders').replace(/\/+$/, '');
    const dbxPath = `/${base}${folder}/${client}/${filename}`.replace(/\/+/g, '/');

    // Upload
    const up = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: dbxPath, mode: 'add', autorename: true, mute: false }),
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuf,
    });
    if (!up.ok) return res.status(502).json({ error: await up.text() });

    // Share (create or reuse)
    const mk = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dbxPath, settings: { requested_visibility: 'public' } }),
    });

    let url: string | null = null;
    if (mk.ok) {
      const j = await mk.json();
      url = j?.url || null;
    } else {
      const j = await mk.json();
      if (j?.error_summary?.includes('shared_link_already_exists')) {
        const ls = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: dbxPath }),
        });
        const lj = await ls.json();
        url = lj?.links?.[0]?.url || null;
      } else {
        return res.status(502).json({ error: j });
      }
    }

    if (url && !url.includes('?dl=1')) url = url.replace('?dl=0', '?dl=1');
    return res.status(200).json({ url });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}