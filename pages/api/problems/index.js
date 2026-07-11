const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { status, branch_id } = req.query;
    let sql = `SELECT p.*, b.name as branch_name, u.full_name as created_by_name
               FROM problems p JOIN branches b ON b.id = p.branch_id
               LEFT JOIN users u ON u.id = p.created_by WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (branch_id) { sql += ' AND p.branch_id = ?'; params.push(branch_id); }
    sql += ' ORDER BY p.created_at DESC';
    const problems = db.prepare(sql).all(...params);
    return res.status(200).json({ problems });
  }

  if (req.method === 'POST') {
    const { branch_id, source, description } = req.body || {};
    if (!branch_id || !description) return res.status(400).json({ error: 'الفرع والوصف مطلوبان' });
    const info = db.prepare('INSERT INTO problems (branch_id, source, description, created_by) VALUES (?,?,?,?)')
      .run(branch_id, source || 'ملاحظات عامة', description, req.user.id);
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_problems');
