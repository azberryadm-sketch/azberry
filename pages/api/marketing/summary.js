const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  // فقط الأقسام المصنّفة "ماركتنك" (يحددها الأدمن من صفحة أقسام التقييم)
  const marketingSections = db.prepare(`SELECT id, name FROM sections WHERE category = 'ماركتنك' AND active = 1`).all();
  const sectionIds = marketingSections.map(s => s.id);

  if (sectionIds.length === 0) {
    return res.status(200).json({ sections: [], rows: [] });
  }

  const rows = db.prepare(`
    SELECT ei.score, ei.note, ei.photo_path, s.name as section_name, b.name as branch_name, e.visit_date, e.id as evaluation_id
    FROM evaluation_items ei
    JOIN sections s ON s.id = ei.section_id
    JOIN evaluations e ON e.id = ei.evaluation_id
    JOIN branches b ON b.id = e.branch_id
    WHERE ei.section_id IN (${sectionIds.map(() => '?').join(',')}) AND e.archived = 0
    ORDER BY e.visit_date DESC
    LIMIT 100
  `).all(...sectionIds);

  res.status(200).json({ sections: marketingSections, rows });
}

export default requireAuth(handler, 'view_marketing_dashboard');
