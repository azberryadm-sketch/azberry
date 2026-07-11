const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { list_key } = req.query;
    if (list_key) {
      const options = db.prepare('SELECT * FROM dropdown_options WHERE list_key=? ORDER BY sort_order, id').all(list_key);
      return res.status(200).json({ options });
    }
    const all = db.prepare('SELECT * FROM dropdown_options ORDER BY list_key, sort_order, id').all();
    return res.status(200).json({ options: all });
  }

  if (req.method === 'POST') {
    if (!hasPermission(req.user, 'manage_dropdowns')) return res.status(403).json({ error: 'لا تملك صلاحية إدارة القوائم المنسدلة' });
    const { list_key, value } = req.body || {};
    if (!list_key || !value) return res.status(400).json({ error: 'المفتاح والقيمة مطلوبان' });
    const maxOrder = db.prepare('SELECT MAX(sort_order) m FROM dropdown_options WHERE list_key=?').get(list_key).m || 0;
    const info = db.prepare('INSERT INTO dropdown_options (list_key, value, sort_order) VALUES (?,?,?)').run(list_key, value, maxOrder + 1);
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler);
