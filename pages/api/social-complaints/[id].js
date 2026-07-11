const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'PUT') {
    const { status, notified, compensation } = req.body || {};
    const current = db.prepare('SELECT * FROM social_complaints WHERE id=?').get(id);
    if (!current) return res.status(404).json({ error: 'غير موجود' });
    db.prepare('UPDATE social_complaints SET status=?, notified=?, compensation=? WHERE id=?').run(
      status ?? current.status,
      notified !== undefined ? (notified ? 1 : 0) : current.notified,
      compensation !== undefined ? compensation : current.compensation,
      id
    );
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM social_complaints WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
}

export default requireAuth(handler, 'manage_social_complaints');
