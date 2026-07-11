const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'PUT') {
    const { status } = req.body || {};
    db.prepare('UPDATE camera_notes SET status=? WHERE id=?').run(status, req.query.id);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM camera_notes WHERE id=?').run(req.query.id);
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
}

export default requireAuth(handler, 'manage_camera_notes');
