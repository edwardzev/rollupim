export default function handler(_req: any, res: any) {
  res.json({
    hasRefresh: !!process.env.DROPBOX_REFRESH_TOKEN,
    hasKey: !!process.env.DROPBOX_APP_KEY,
    hasSecret: !!process.env.DROPBOX_APP_SECRET,
    now: new Date().toISOString(),
  });
}