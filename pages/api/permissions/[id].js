const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM permission_defs WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
}

export default requireAuth(handler, 'manage_settings');
