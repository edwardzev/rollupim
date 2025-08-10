export const config = { runtime: 'nodejs' };

import fs from 'fs/promises';
import path from 'node:path';

export default async function handler(req, res) {
  try {
    const p = path.join(process.cwd(), 'content', 'kb.json');
    const raw = await fs.readFile(p, 'utf8');
    const kb = JSON.parse(raw);
    res.status(200).json({
      entries: Array.isArray(kb) ? kb.length : 0,
      used: p
    });
  } catch (e) {
    res.status(200).json({ entries: 0, error: e.message });
  }
}
