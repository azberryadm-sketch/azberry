const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { user_id } = req.query;
    let sql = `SELECT h.*, u.full_name as user_name, c.full_name as created_by_name
               FROM hr_records h JOIN users u ON u.id = h.user_id
               LEFT JOIN users c ON c.id = h.created_by WHERE 1=1`;
    const params = [];
    if (user_id) { sql += ' AND h.user_id = ?'; params.push(user_id); }
    sql += ' ORDER BY h.created_at DESC';
    return res.status(200).json({ records: db.prepare(sql).all(...params) });
  }

  if (req.method === 'POST') {
    const { user_id, type, title, details, start_date, end_date } = req.body || {};
    if (!user_id || !type) return res.status(400).json({ error: 'الموظف ونوع السجل مطلوبان' });
    const info = db.prepare(`INSERT INTO hr_records (user_id, type, title, details, start_date, end_date, created_by) VALUES (?,?,?,?,?,?,?)`)
      .run(user_id, type, title || null, details || null, start_date || null, end_date || null, req.user.id);
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_hr');
