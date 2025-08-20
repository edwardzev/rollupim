// api/debug/syn.js
export const config = { runtime: 'nodejs' };

import fs from 'fs/promises';
import path from 'node:path';

export default async function handler(req, res) {
  try {
    const p = path.join(process.cwd(), 'content', 'synonyms.json');
    const raw = await fs.readFile(p, 'utf8');
    const data = JSON.parse(raw);

    // If the file is an object, count top-level keys; if array, length
    const entries =
      Array.isArray(data) ? data.length : (data && typeof data === 'object') ? Object.keys(data).length : 0;

    res.status(200).json({
      entries,
      used: p,
      type: Array.isArray(data) ? 'array' : typeof data,
    });
  } catch (e) {
    res.status(200).json({ entries: 0, error: e.message });
  }
}