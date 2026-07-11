const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    // تحديث حالة الدورات تلقائياً حسب الوقت الحالي
    const now = new Date().toISOString();
    db.prepare(`UPDATE performance_sessions SET status='open' WHERE status='upcoming' AND start_at <= ?`).run(now);
    db.prepare(`UPDATE performance_sessions SET status='closed' WHERE status='open' AND end_at <= ?`).run(now);
    const sessions = db.prepare('SELECT ps.*, u.full_name as created_by_name FROM performance_sessions ps LEFT JOIN users u ON u.id=ps.created_by ORDER BY ps.created_at DESC').all();
    return res.json({ sessions });
  }

  if (req.method === 'POST') {
    const { title, start_at, end_at } = req.body || {};
    if (!title || !start_at || !end_at) return res.status(400).json({ error: 'البيانات ناقصة' });
    const now = new Date().toISOString();
    const status = start_at <= now ? (end_at > now ? 'open' : 'closed') : 'upcoming';
    const r = db.prepare('INSERT INTO performance_sessions (title, start_at, end_at, status, created_by) VALUES (?,?,?,?,?)').run(title, start_at, end_at, status, req.user.id);
    return res.json({ id: r.lastInsertRowid });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    db.prepare('DELETE FROM performance_sessions WHERE id=?').run(id);
    return res.json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler);
