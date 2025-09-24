// api/dbx-ping.ts
export default function handler(req: any, res: any) {
  const refresh = process.env.DROPBOX_REFRESH_TOKEN || "";
  const key = process.env.DROPBOX_APP_KEY || "";
  const secret = process.env.DROPBOX_APP_SECRET || "";

  res.status(200).json({
    hasRefresh: !!refresh,
    hasKey: !!key,
    hasSecret: !!secret,
    lenRefresh: refresh.length,
    lenKey: key.length,
    lenSecret: secret.length,
    now: new Date().toISOString(),
  });
}