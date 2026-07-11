const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  if (req.method === 'GET') {
    const canManage = hasPermission(req.user, 'manage_tasks');
    let sql = `SELECT t.*, b.name as branch_name, u.full_name as assigned_name, c.full_name as created_by_name
               FROM tasks t
               LEFT JOIN branches b ON b.id = t.branch_id
               LEFT JOIN users u ON u.id = t.assigned_to
               LEFT JOIN users c ON c.id = t.created_by`;
    const params = [];
    if (!canManage) {
      sql += ' WHERE t.assigned_to = ?';
      params.push(req.user.id);
    }
    sql += ' ORDER BY t.created_at DESC';
    return res.status(200).json({ tasks: db.prepare(sql).all(...params) });
  }

  if (req.method === 'POST') {
    if (!hasPermission(req.user, 'manage_tasks')) return res.status(403).json({ error: 'لا تملك صلاحية إنشاء المهام' });
    const { title, description, branch_id, assigned_to, priority, due_date } = req.body || {};
    if (!title || !assigned_to) return res.status(400).json({ error: 'العنوان والموظف المسؤول مطلوبان' });
    const info = db.prepare(`INSERT INTO tasks (title, description, branch_id, assigned_to, priority, due_date, created_by) VALUES (?,?,?,?,?,?,?)`)
      .run(title, description || null, branch_id || null, assigned_to, priority || 'متوسطة', due_date || null, req.user.id);
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_tasks');
