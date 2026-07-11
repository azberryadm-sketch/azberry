const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { branch_id } = req.query;
    let sql = `SELECT c.*, b.name as branch_name, u.full_name as created_by_name
               FROM camera_notes c JOIN branches b ON b.id = c.branch_id
               LEFT JOIN users u ON u.id = c.created_by WHERE 1=1`;
    const params = [];
    if (branch_id) { sql += ' AND c.branch_id = ?'; params.push(branch_id); }
    sql += ' ORDER BY c.created_at DESC';
    return res.status(200).json({ notes: db.prepare(sql).all(...params) });
  }

  if (req.method === 'POST') {
    const {
      branch_id, job_title, employee_name, camera_time, report_date,
      camera_location, violation, description, category, media_paths,
    } = req.body || {};
    if (!branch_id || !camera_location || !violation) {
      return res.status(400).json({ error: 'الفرع، الكاميرا، والمخالفة حقول مطلوبة' });
    }
    const info = db.prepare(`
      INSERT INTO camera_notes
      (branch_id, job_title, employee_name, camera_time, report_date, camera_location, violation, description, category, media_paths, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      branch_id, job_title || null, employee_name || null, camera_time || null,
      report_date || new Date().toISOString().slice(0, 10), camera_location, violation,
      description || null, category || 'أخرى', JSON.stringify(media_paths || []), req.user.id
    );
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_camera_notes');
