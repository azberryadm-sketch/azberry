const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'GET') {
    const evalData = db.prepare(`SELECT pe.*, b.name as branch_name FROM performance_evals pe LEFT JOIN branches b ON b.id=pe.branch_id WHERE pe.id=?`).get(id);
    if (!evalData) return res.status(404).json({ error: 'غير موجود' });
    const items = db.prepare(`SELECT pei.*, pc.name as criterion_name, pc.max_score FROM performance_eval_items pei JOIN performance_criteria pc ON pc.id=pei.criterion_id WHERE pei.eval_id=? ORDER BY pc.sort_order`).all(id);
    return res.json({ eval: evalData, items });
  }
  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM performance_evals WHERE id=?').run(id);
    return res.json({ ok: true });
  }
  res.status(405).end();
}

export default requireAuth(handler);
