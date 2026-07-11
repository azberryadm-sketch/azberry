const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    if (!hasPermission(req.user, 'manage_problems')) return res.status(403).json({ error: 'لا تملك صلاحية تعديل المشاكل' });
    const { status, source, description, branch_id } = req.body || {};

    if (status !== undefined) {
      if (!['open', 'resolved'].includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
      db.prepare('UPDATE problems SET status=?, resolved_at=? WHERE id=?')
        .run(status, status === 'resolved' ? new Date().toISOString() : null, id);
    }

    if (source !== undefined || description !== undefined || branch_id !== undefined) {
      const current = db.prepare('SELECT * FROM problems WHERE id=?').get(id);
      if (!current) return res.status(404).json({ error: 'المشكلة غير موجودة' });
      db.prepare('UPDATE problems SET source=?, description=?, branch_id=? WHERE id=?').run(
        source ?? current.source,
        description ?? current.description,
        branch_id ?? current.branch_id,
        id
      );
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!hasPermission(req.user, 'manage_problems')) return res.status(403).json({ error: 'لا تملك صلاحية حذف المشاكل' });
    db.prepare('DELETE FROM problems WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_problems');
