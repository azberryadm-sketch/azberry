const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  const { id } = req.query;
  if (!hasPermission(req.user, 'manage_branches')) return res.status(403).json({ error: 'لا تملك صلاحية إدارة الأفرع' });

  if (req.method === 'PUT') {
    const { name, code, city, address, active } = req.body || {};
    db.prepare('UPDATE branches SET name=?, code=?, city=?, address=?, active=? WHERE id=?')
      .run(name, code || null, city || null, address || null, active ? 1 : 0, id);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM branches WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler);
