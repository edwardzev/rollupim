export default async function handler(req: any, res: any) {
  res.status(200).json({
    hasToken: !!process.env.DROPBOX_TOKEN,
    tokenLength: process.env.DROPBOX_TOKEN?.length || 0,
    now: new Date().toISOString(),
  });
}