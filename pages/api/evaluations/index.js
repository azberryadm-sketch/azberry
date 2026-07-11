const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { branch_id, archived } = req.query;
    const archivedFlag = archived === '1' ? 1 : 0;
    const conditions = ['e.archived = ?'];
    const params = [archivedFlag];
    if (branch_id) { conditions.push('e.branch_id = ?'); params.push(branch_id); }
    const rows = db.prepare(`
      SELECT e.*, b.name as branch_name, u.full_name as inspector_name
      FROM evaluations e
      JOIN branches b ON b.id = e.branch_id
      JOIN users u ON u.id = e.inspector_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.visit_date DESC, e.id DESC
      LIMIT 300
    `).all(...params);
    return res.status(200).json({ evaluations: rows });
  }

  if (req.method === 'POST') {
    const { branch_id, visit_date, items, general_notes, problems } = req.body || {};
    // items: [{ section_id, score, note }]
    if (!branch_id || !visit_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'بيانات ناقصة: الفرع، تاريخ الزيارة، ودرجات الأقسام مطلوبة' });
    }

    const maxScorePerItem = 5;
    const totalMax = items.length * maxScorePerItem;
    const totalScore = items.reduce((sum, it) => sum + Number(it.score || 0), 0);
    const overallPercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : 0;

    const insertEval = db.prepare(`
      INSERT INTO evaluations (branch_id, inspector_id, visit_date, overall_score, general_notes, status)
      VALUES (?,?,?,?,?, 'submitted')
    `);
    const info = insertEval.run(branch_id, req.user.id, visit_date, overallPercent, general_notes || null);
    const evaluationId = info.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO evaluation_items (evaluation_id, section_id, score, note, photo_path, media_paths) VALUES (?,?,?,?,?,?)');
    const insertNotif = db.prepare('INSERT INTO notifications (branch_id, evaluation_id, message, level) VALUES (?,?,?,?)');
    const sectionStmt = db.prepare('SELECT name, min_score FROM sections WHERE id=?');
    const branchStmt = db.prepare('SELECT name FROM branches WHERE id=?');
    const branchName = branchStmt.get(branch_id)?.name || '';

    items.forEach(it => {
      insertItem.run(evaluationId, it.section_id, it.score, it.note || null, it.photo_path || null, JSON.stringify(it.media_paths || []));
      const section = sectionStmt.get(it.section_id);
      if (section && Number(it.score) < Number(section.min_score)) {
        insertNotif.run(
          branch_id,
          evaluationId,
          `تنبيه: قسم "${section.name}" في فرع "${branchName}" سجّل درجة ${it.score} أقل من الحد الأدنى ${section.min_score}`,
          Number(it.score) <= section.min_score - 1.5 ? 'danger' : 'warning'
        );
      }
    });

    if (overallPercent < 60) {
      insertNotif.run(branch_id, evaluationId, `تنبيه: التقييم العام لفرع "${branchName}" منخفض (${overallPercent}%)`, 'danger');
    }

    if (Array.isArray(problems)) {
      const insertProblem = db.prepare(`
        INSERT INTO problems (branch_id, evaluation_id, source, description, created_by)
        VALUES (?,?,?,?,?)
      `);
      problems.forEach(p => {
        if (p.description && p.description.trim()) {
          insertProblem.run(branch_id, evaluationId, p.source || 'ملاحظات عامة', p.description.trim(), req.user.id);
        }
      });
    }

    return res.status(201).json({ id: evaluationId, overall_score: overallPercent });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'view_evaluations');
