const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { getAllPermissions } = require('../../../lib/permissions');

async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ permissions: getAllPermissions() });
  }

  if (req.method === 'POST') {
    const { key, label, group } = req.body || {};
    if (!key || !label) return res.status(400).json({ error: 'المفتاح والاسم مطلوبان' });
    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    const exists = db.prepare('SELECT id FROM permission_defs WHERE key = ?').get(cleanKey);
    if (exists) return res.status(400).json({ error: 'هذه الصلاحية موجودة مسبقاً' });
    const info = db.prepare('INSERT INTO permission_defs (key, label, "group") VALUES (?,?,?)').run(cleanKey, label, group || 'عام');
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_settings');
