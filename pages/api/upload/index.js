const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../../../lib/auth');

export const config = { api: { bodyParser: { sizeLimit: '30mb' } } };

function getUploadDir() {
  const dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extFromMime(mime) {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  return 'jpg';
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { base64, mime } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'لا يوجد ملف' });

  const ext = extFromMime(mime);
  const filename = `${uuidv4()}.${ext}`;
  const buffer = Buffer.from(base64.split(',').pop(), 'base64');
  fs.writeFileSync(path.join(getUploadDir(), filename), buffer);

  res.status(200).json({ path: `/api/uploads/${filename}` });
}

export default requireAuth(handler, 'view_evaluations');
