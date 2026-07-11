const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { session_id, branch_id } = req.query;
    let q = `SELECT pe.*, b.name as branch_name, u.full_name as submitted_by_name
             FROM performance_evals pe
             LEFT JOIN branches b ON b.id=pe.branch_id
             LEFT JOIN users u ON u.id=pe.submitted_by
             WHERE 1=1`;
    const params = [];
    if (session_id) { q += ' AND pe.session_id=?'; params.push(session_id); }
    if (branch_id) { q += ' AND pe.branch_id=?'; params.push(branch_id); }
    q += ' ORDER BY pe.created_at DESC';
    const evals = db.prepare(q).all(...params);
    const criteria = db.prepare('SELECT * FROM performance_criteria WHERE active=1 ORDER BY sort_order').all();
    return res.json({ evals, criteria });
  }

  if (req.method === 'POST') {
    const { session_id, employee_name, branch_id, supervisor_name, job_title, eval_date, general_notes, items } = req.body || {};
    if (!session_id || !employee_name) return res.status(400).json({ error: 'البيانات ناقصة' });

    // التحقق من أن الدورة مفتوحة
    const session = db.prepare('SELECT * FROM performance_sessions WHERE id=?').get(session_id);
    if (!session || session.status !== 'open') return res.status(403).json({ error: 'دورة التقييم غير مفتوحة حالياً' });

    const total_score = (items || []).reduce((sum, i) => sum + (Number(i.score) || 0), 0);
    const evalRes = db.prepare(
      'INSERT INTO performance_evals (session_id, employee_name, branch_id, supervisor_name, job_title, eval_date, general_notes, total_score, submitted_by) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(session_id, employee_name, branch_id || null, supervisor_name, job_title, eval_date || new Date().toISOString().slice(0,10), general_notes, total_score, req.user.id);

    const evalId = evalRes.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO performance_eval_items (eval_id, criterion_id, score, reason) VALUES (?,?,?,?)');
    for (const item of (items || [])) {
      insertItem.run(evalId, item.criterion_id, item.score || 0, item.reason || '');
    }

    return res.json({ id: evalId, total_score });
  }

  res.status(405).end();
}

export default requireAuth(handler);
