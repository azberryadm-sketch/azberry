const fs = require('fs');
const path = require('path');
const { getUserFromReq } = require('../../../lib/auth');

// إلغاء حد الـ 4MB الافتراضي لـ Next.js لملفات الميديا
export const config = { 
  api: { 
    responseLimit: false,
    bodyParser: false,
  } 
};

function getUploadDir() {
  return path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
}

const CONTENT_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/mp4', webm: 'video/webm', gif: 'image/gif',
};

export default function handler(req, res) {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).end();

  const { filename } = req.query;
  const safeName = path.basename(String(filename));
  const filePath = path.join(getUploadDir(), safeName);

  if (!fs.existsSync(filePath)) return res.status(404).end();

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // دعم Range Requests للفيديو (يسمح بتشغيله مباشرة بالمتصفح)
  if (range && contentType.startsWith('video/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  }
}
