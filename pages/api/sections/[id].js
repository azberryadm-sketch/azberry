const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, description, min_score, sort_order, active, category } = req.body || {};
    db.prepare('UPDATE sections SET name=?, description=?, min_score=?, sort_order=?, active=?, category=? WHERE id=?')
      .run(name, description || null, min_score || 3, sort_order || 0, active === 0 ? 0 : 1, category || 'عام', id);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    db.prepare('UPDATE sections SET active=0 WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_sections');
