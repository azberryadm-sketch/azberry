const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const evaluation = db.prepare(`
      SELECT e.*, b.name as branch_name, b.city, u.full_name as inspector_name
      FROM evaluations e
      JOIN branches b ON b.id = e.branch_id
      JOIN users u ON u.id = e.inspector_id
      WHERE e.id = ?
    `).get(id);
    if (!evaluation) return res.status(404).json({ error: 'التقييم غير موجود' });

    const items = db.prepare(`
      SELECT ei.*, s.name as section_name, s.min_score
      FROM evaluation_items ei
      JOIN sections s ON s.id = ei.section_id
      WHERE ei.evaluation_id = ?
    `).all(id);

    const problems = db.prepare('SELECT * FROM problems WHERE evaluation_id = ?').all(id);

    return res.status(200).json({ evaluation, items, problems });
  }

  if (req.method === 'PUT') {
    // تستخدم حالياً لاستعادة تقييم من الأرشيف
    if (!hasPermission(req.user, 'manage_archive')) {
      return res.status(403).json({ error: 'لا تملك صلاحية إدارة الأرشيف' });
    }
    const { archived } = req.body || {};
    db.prepare('UPDATE evaluations SET archived=?, archived_at=? WHERE id=?')
      .run(archived ? 1 : 0, archived ? new Date().toISOString() : null, id);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!hasPermission(req.user, 'delete_evaluations')) {
      return res.status(403).json({ error: 'لا تملك صلاحية حذف التقارير' });
    }
    db.prepare('DELETE FROM evaluations WHERE id = ?').run(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_evaluations');
