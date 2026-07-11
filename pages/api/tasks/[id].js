const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  const { id } = req.query;
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  if (!task) return res.status(404).json({ error: 'المهمة غير موجودة' });

  const canManage = hasPermission(req.user, 'manage_tasks');
  const isOwner = task.assigned_to === req.user.id;
  if (!canManage && !isOwner) return res.status(403).json({ error: 'لا تملك صلاحية الوصول لهذه المهمة' });

  if (req.method === 'PUT') {
    const { status, title, description, priority, due_date, assigned_to, branch_id } = req.body || {};
    // الموظف العادي يقدر بس يغيّر الحالة، المدير يقدر يعدّل كل شي
    if (canManage) {
      db.prepare(`UPDATE tasks SET title=?, description=?, priority=?, due_date=?, assigned_to=?, branch_id=?, status=? WHERE id=?`)
        .run(title ?? task.title, description ?? task.description, priority ?? task.priority, due_date ?? task.due_date, assigned_to ?? task.assigned_to, branch_id ?? task.branch_id, status ?? task.status, id);
    } else if (status) {
      db.prepare('UPDATE tasks SET status=? WHERE id=?').run(status, id);
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!canManage) return res.status(403).json({ error: 'لا تملك صلاحية حذف المهام' });
    db.prepare('DELETE FROM tasks WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_tasks');
