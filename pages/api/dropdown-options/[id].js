const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  if (!hasPermission(req.user, 'manage_dropdowns')) return res.status(403).json({ error: 'لا تملك صلاحية إدارة القوائم المنسدلة' });
  if (req.method === 'PUT') {
    const { value } = req.body || {};
    db.prepare('UPDATE dropdown_options SET value=? WHERE id=?').run(value, req.query.id);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM dropdown_options WHERE id=?').run(req.query.id);
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
}

export default requireAuth(handler);
