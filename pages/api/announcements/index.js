const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  if (req.method === 'GET') {
    const canManage = hasPermission(req.user, 'manage_announcements');
    let sql = `SELECT a.*, u.full_name as target_name, c.full_name as created_by_name,
               (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = ${req.user.id}) as is_read
               FROM announcements a
               LEFT JOIN users u ON u.id = a.target_user_id
               LEFT JOIN users c ON c.id = a.created_by`;
    if (!canManage) {
      sql += ` WHERE a.target_user_id IS NULL OR a.target_user_id = ${req.user.id}`;
    }
    sql += ' ORDER BY a.created_at DESC';
    return res.status(200).json({ announcements: db.prepare(sql).all() });
  }

  if (req.method === 'POST') {
    if (!hasPermission(req.user, 'manage_announcements')) return res.status(403).json({ error: 'لا تملك صلاحية إرسال التبليغات' });
    const { title, message, target_user_id } = req.body || {};
    if (!title || !message) return res.status(400).json({ error: 'العنوان والرسالة مطلوبان' });
    const info = db.prepare('INSERT INTO announcements (title, message, target_user_id, created_by) VALUES (?,?,?,?)')
      .run(title, message, target_user_id || null, req.user.id);
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler);
