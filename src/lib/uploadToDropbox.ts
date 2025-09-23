/// <reference types="vite/client" />
let __dbxCounter = 0;

export async function uploadToDropbox(file: File, clientName: string, kind: 'primary'|'assist'|'extra'): Promise<string|null> {
  const endpoint = import.meta.env.VITE_DBX_PROXY_URL;
  if (!endpoint) return null;

  __dbxCounter++;
  const ts = new Date().toISOString().replace(/[-:T]/g,'').slice(0,12); // YYYYMMDDHHMM
  const base = (clientName || 'לקוח').trim();
  const safeSlug = base.normalize('NFKD').replace(/[^\w\-]+/g,'-');
  const ext = file.name.split('.').pop() || 'bin';
  const name = `${safeSlug}_${ts}_${__dbxCounter}_${kind}.${ext}`;

  const fd = new FormData();
  fd.append('file', new File([file], name, { type: file.type }));
  fd.append('path', '/orders');
  fd.append('client', base);

  try {
    const r = await fetch(endpoint, { method: 'POST', body: fd });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.url || null;
  } catch {
    return null;
  }
}