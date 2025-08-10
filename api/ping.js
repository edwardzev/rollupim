export const config = { runtime: 'nodejs' }; // ensure Node runtime

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send('pong');
}