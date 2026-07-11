const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const notifications = db.prepare(`
      SELECT n.*, b.name as branch_name FROM notifications n
      LEFT JOIN branches b ON b.id = n.branch_id
      ORDER BY n.created_at DESC LIMIT 100
    `).all();
    const unreadCount = db.prepare('SELECT COUNT(*) c FROM notifications WHERE is_read=0').get().c;
    return res.status(200).json({ notifications, unreadCount });
  }

  if (req.method === 'PUT') {
    // تحديد الكل كمقروء
    db.prepare('UPDATE notifications SET is_read=1').run();
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_notifications');
