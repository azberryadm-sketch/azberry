const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    rows.forEach(r => (obj[r.key] = r.value));
    return res.status(200).json({ settings: obj });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ error: 'مفتاح الإعداد مطلوب' });
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value ?? '');
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'مفتاح الإعداد مطلوب' });
    db.prepare('DELETE FROM settings WHERE key=?').run(key);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_settings');
