const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { branch_id } = req.query;
    let sql = `SELECT s.*, b.name as branch_name, u.full_name as created_by_name
               FROM social_complaints s JOIN branches b ON b.id = s.branch_id
               LEFT JOIN users u ON u.id = s.created_by WHERE 1=1`;
    const params = [];
    if (branch_id) { sql += ' AND s.branch_id = ?'; params.push(branch_id); }
    sql += ' ORDER BY s.complaint_date DESC, s.id DESC';
    return res.status(200).json({ complaints: db.prepare(sql).all(...params) });
  }

  if (req.method === 'POST') {
    const { branch_id, complaint_date, problem_type, complaint_text, platform, compensation, notified } = req.body || {};
    if (!branch_id || !problem_type) return res.status(400).json({ error: 'الفرع ونوع المشكلة مطلوبان' });
    const info = db.prepare(`
      INSERT INTO social_complaints (branch_id, complaint_date, problem_type, complaint_text, platform, compensation, notified, created_by)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      branch_id, complaint_date || new Date().toISOString().slice(0, 10), problem_type,
      complaint_text || null, platform || null, compensation || null, notified ? 1 : 0, req.user.id
    );
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_social_complaints');
