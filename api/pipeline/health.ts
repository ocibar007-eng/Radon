export default function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
}
