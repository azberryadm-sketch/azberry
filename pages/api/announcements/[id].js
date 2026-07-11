const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    // تستخدم لتحديد التبليغ كمقروء، أو لتسجيل إنه أُرسل عبر واتساب
    const { mark_read, mark_whatsapp_sent } = req.body || {};
    if (mark_read) {
      db.prepare('INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?,?)').run(id, req.user.id);
    }
    if (mark_whatsapp_sent) {
      db.prepare('UPDATE announcements SET sent_whatsapp = 1 WHERE id=?').run(id);
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler);
