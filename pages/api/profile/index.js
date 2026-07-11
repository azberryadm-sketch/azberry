const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const user = db.prepare('SELECT id, username, full_name, phone, employee_id, email, role, photo_path FROM users WHERE id=?').get(req.user.id);
    return res.status(200).json({ user });
  }

  if (req.method === 'PUT') {
    const { photo_path } = req.body || {};
    if (photo_path !== undefined) {
      db.prepare('UPDATE users SET photo_path=? WHERE id=?').run(photo_path, req.user.id);
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler);
