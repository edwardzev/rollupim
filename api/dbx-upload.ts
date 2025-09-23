// Enhanced Dropbox upload endpoint with detailed logging
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      console.warn('dbx-upload: wrong method', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = process.env.DROPBOX_TOKEN;
    if (!token) {
      console.error('dbx-upload: missing DROPBOX_TOKEN');
      return res.status(500).json({ error: 'Missing DROPBOX_TOKEN' });
    }

    // ---- parse multipart via busboy
    const { default: Busboy } = await import('busboy');
    const bb = Busboy({ headers: req.headers });

    const fields: Record<string, string> = {};
    const chunks: Buffer[] = [];
    let filename = 'upload.bin';
    let mimetype = 'application/octet-stream';

    const done = new Promise<void>((resolve, reject) => {
      bb.on('file', (_name, file, info) => {
        filename = info?.filename || filename;
        mimetype = (info as any)?.mimeType || mimetype;
        file.on('data', (d: Buffer) => chunks.push(d));
        file.on('end', () => console.log('dbx-upload: file stream ended'));
      });
      bb.on('field', (name, val) => (fields[name] = String(val || '')));
      bb.on('error', (err) => reject(err));
      bb.on('close', () => resolve());
    });

    req.pipe(bb);
    await done;

    const fileBuf = Buffer.concat(chunks);
    const client = (fields.client || 'client').trim();
    const base = '/Print Market Team Folder/rollupim';
    const folder = (fields.path || '/orders').replace(/\/+$/, '');
    const dbxPath = `/${base}${folder}/${client}/${filename}`.replace(/\/+/, '/');

    console.log('dbx-upload: parsed', {
      bytes: fileBuf.length,
      filename,
      mimetype,
      client,
      folder,
      dbxPath,
    });

    if (!fileBuf.length) {
      console.error('dbx-upload: empty file buffer');
      return res.status(400).json({ error: 'No file' });
    }

    // ---- upload to Dropbox
    const upRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: dbxPath, mode: 'add', autorename: true, mute: false }),
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuf,
    });

    const upText = await upRes.text();
    if (!upRes.ok) {
      console.error('dbx-upload: upload failed', upRes.status, upText);
      return res.status(502).json({ error: upText });
    }
    console.log('dbx-upload: upload ok');

    // ---- create or reuse shared link
    const mkRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dbxPath, settings: { requested_visibility: 'public' } }),
    });

    let url: string | null = null;
    if (mkRes.ok) {
      const mkJson: any = await mkRes.json();
      url = mkJson?.url || null;
      console.log('dbx-upload: share ok', url);
    } else {
      const mkText = await mkRes.text();
      if (mkText.includes('shared_link_already_exists')) {
        const lsRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: dbxPath }),
        });
        const lsText = await lsRes.text();
        if (!lsRes.ok) {
          console.error('dbx-upload: list_shared_links failed', lsRes.status, lsText);
          return res.status(502).json({ error: lsText });
        }
        try {
          const lsJson: any = JSON.parse(lsText);
          url = lsJson?.links?.[0]?.url || null;
          console.log('dbx-upload: reused existing link', url);
        } catch (e) {
          console.error('dbx-upload: parse list_shared_links failed', e);
          return res.status(502).json({ error: lsText });
        }
      } else {
        console.error('dbx-upload: create_shared_link failed', mkRes.status, mkText);
        return res.status(502).json({ error: mkText });
      }
    }

    if (url && !url.includes('?dl=1')) url = url.replace('?dl=0', '?dl=1');
    return res.status(200).json({ url });
  } catch (e: any) {
    console.error('dbx-upload: unhandled', e?.message || e);
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}