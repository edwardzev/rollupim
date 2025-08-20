// api/debug/syn.js
import fs from 'fs/promises';
import path from 'node:path';

export default async function handler(req, res) {
  try {
    const p = path.join(process.cwd(), 'content', 'synonyms.json');
    const raw = await fs.readFile(p, 'utf8');
    const syn = JSON.parse(raw);
    res.status(200).json({ groups: syn && typeof syn === 'object' ? Object.keys(syn).length : 0 });
  } catch (e) {
    res.status(200).json({ groups: 0, error: e.message });
  }
}