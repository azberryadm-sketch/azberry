const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { violation } = req.query;

  // ترتيب الأفرع من الأعلى مشاكل للأقل (اختياري: فلترة حسب نوع مخالفة محدد)
  const branchRanking = db.prepare(`
    SELECT b.id, b.name,
      (SELECT COUNT(*) FROM camera_notes c WHERE c.branch_id = b.id ${violation ? 'AND c.violation = ?' : ''}) as issues_count,
      (SELECT COUNT(*) FROM camera_notes c WHERE c.branch_id = b.id AND c.status != 'مغلقة' ${violation ? 'AND c.violation = ?' : ''}) as open_count
    FROM branches b
    WHERE b.active = 1
    ORDER BY issues_count DESC
  `).all(...(violation ? [violation, violation] : []));

  // توزيع المخالفات (لأي فلترة عامة أو لمعرفة أكثر أنواع المخالفات تكراراً)
  const violationBreakdown = db.prepare(`
    SELECT violation, COUNT(*) as count FROM camera_notes GROUP BY violation ORDER BY count DESC
  `).all();

  const locationBreakdown = db.prepare(`
    SELECT camera_location, COUNT(*) as count FROM camera_notes GROUP BY camera_location ORDER BY count DESC
  `).all();

  const totalIssues = db.prepare('SELECT COUNT(*) c FROM camera_notes').get().c;
  const openIssues = db.prepare(`SELECT COUNT(*) c FROM camera_notes WHERE status != 'مغلقة'`).get().c;

  const recentIssues = db.prepare(`
    SELECT c.*, b.name as branch_name FROM camera_notes c JOIN branches b ON b.id = c.branch_id
    ORDER BY c.created_at DESC LIMIT 8
  `).all();

  res.status(200).json({
    branchRanking: branchRanking.filter(b => b.issues_count > 0),
    violationBreakdown,
    locationBreakdown,
    totalIssues,
    openIssues,
    recentIssues,
  });
}

export default requireAuth(handler, 'manage_camera_notes');
