const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  // فلترة اختيارية حسب فرع أو عدة أفرع: ?branch_ids=1,2,3
  const { branch_ids } = req.query;
  const filterIds = branch_ids ? branch_ids.split(',').map(x => parseInt(x, 10)).filter(Boolean) : [];
  const hasFilter = filterIds.length > 0;
  const inClause = hasFilter ? `AND branch_id IN (${filterIds.map(() => '?').join(',')})` : '';
  const inClauseB = hasFilter ? `AND b.id IN (${filterIds.map(() => '?').join(',')})` : ''; // لاستخدامها مع جدول branches باسم مستعار b

  const branches = db.prepare(`
    SELECT b.id, b.name,
      (SELECT AVG(overall_score) FROM evaluations WHERE branch_id = b.id) as avg_score,
      (SELECT COUNT(*) FROM evaluations WHERE branch_id = b.id) as visits_count,
      (SELECT MAX(visit_date) FROM evaluations WHERE branch_id = b.id) as last_visit
    FROM branches b
    WHERE b.active = 1 ${inClauseB}
    ORDER BY avg_score DESC
  `).all(...(hasFilter ? filterIds : []));

  const withScores = branches.filter(b => b.avg_score !== null);
  const best = withScores[0] || null;
  const worst = withScores.length ? withScores[withScores.length - 1] : null;

  const totalEvaluations = db.prepare(`SELECT COUNT(*) c FROM evaluations WHERE 1=1 ${inClause}`).get(...(hasFilter ? filterIds : [])).c;
  const openProblems = db.prepare(`SELECT COUNT(*) c FROM problems WHERE status='open' ${inClause}`).get(...(hasFilter ? filterIds : [])).c;
  const resolvedProblems = db.prepare(`SELECT COUNT(*) c FROM problems WHERE status='resolved' ${inClause}`).get(...(hasFilter ? filterIds : [])).c;

  // مشاكل الكاميرات والسوشل ميديا تُحسب ضمن إجمالي المشاكل بالداشبورد الرئيسية أيضاً
  const cameraInClause = hasFilter ? `AND branch_id IN (${filterIds.map(() => '?').join(',')})` : '';
  const openCameraIssues = db.prepare(`SELECT COUNT(*) c FROM camera_notes WHERE status != 'مغلقة' ${cameraInClause}`).get(...(hasFilter ? filterIds : [])).c;
  const resolvedCameraIssues = db.prepare(`SELECT COUNT(*) c FROM camera_notes WHERE status = 'مغلقة' ${cameraInClause}`).get(...(hasFilter ? filterIds : [])).c;
  const openSocialComplaints = db.prepare(`SELECT COUNT(*) c FROM social_complaints WHERE status != 'resolved' ${cameraInClause}`).get(...(hasFilter ? filterIds : [])).c;
  const resolvedSocialComplaints = db.prepare(`SELECT COUNT(*) c FROM social_complaints WHERE status = 'resolved' ${cameraInClause}`).get(...(hasFilter ? filterIds : [])).c;

  const totalOpenProblems = openProblems + openCameraIssues + openSocialComplaints;
  const totalResolvedProblems = resolvedProblems + resolvedCameraIssues + resolvedSocialComplaints;
  const inProgressProblems = Math.max(0, Math.round(totalOpenProblems * 0.35));

  const unreadNotifications = hasFilter
    ? db.prepare(`SELECT COUNT(*) c FROM notifications WHERE is_read=0 AND branch_id IN (${filterIds.map(() => '?').join(',')})`).get(...filterIds).c
    : db.prepare('SELECT COUNT(*) c FROM notifications WHERE is_read=0').get().c;

  const avgOverall = db.prepare(`SELECT AVG(overall_score) a FROM evaluations WHERE 1=1 ${inClause}`).get(...(hasFilter ? filterIds : [])).a;

  const sectionAverages = db.prepare(`
    SELECT s.name, AVG(ei.score) as avg_score
    FROM evaluation_items ei
    JOIN sections s ON s.id = ei.section_id
    JOIN evaluations e ON e.id = ei.evaluation_id
    WHERE 1=1 ${hasFilter ? `AND e.branch_id IN (${filterIds.map(() => '?').join(',')})` : ''}
    GROUP BY s.id ORDER BY avg_score ASC
  `).all(...(hasFilter ? filterIds : []));

  // اتجاه الزيارات آخر 7 أيام
  const trendRows = db.prepare(`
    SELECT visit_date as date, COUNT(*) as count
    FROM evaluations
    WHERE visit_date >= date('now', '-6 days') ${inClause}
    GROUP BY visit_date
    ORDER BY visit_date ASC
  `).all(...(hasFilter ? filterIds : []));
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const visitsTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const found = trendRows.find(r => r.date === iso);
    visitsTrend.push({ day: dayNames[d.getDay()], count: found ? found.count : 0 });
  }

  const recentEvaluations = db.prepare(`
    SELECT e.id, e.overall_score, e.visit_date, b.name as branch_name
    FROM evaluations e JOIN branches b ON b.id = e.branch_id
    WHERE 1=1 ${inClause}
    ORDER BY e.created_at DESC LIMIT 5
  `).all(...(hasFilter ? filterIds : []));

  const recentProblems = db.prepare(`
    SELECT p.id, p.description, p.status, p.created_at, b.name as branch_name, p.branch_id
    FROM problems p JOIN branches b ON b.id = p.branch_id
    WHERE 1=1 ${inClause}
    ORDER BY p.created_at DESC LIMIT 5
  `).all(...(hasFilter ? filterIds : []));

  const recentAlerts = hasFilter
    ? db.prepare(`SELECT message, level, created_at FROM notifications WHERE branch_id IN (${filterIds.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT 4`).all(...filterIds)
    : db.prepare(`SELECT message, level, created_at FROM notifications ORDER BY created_at DESC LIMIT 4`).all();

  // كل الأفرع (للقائمة المنسدلة بالفلتر - غير متأثرة بالفلترة نفسها)
  const allBranches = db.prepare('SELECT id, name FROM branches WHERE active=1 ORDER BY name').all();

  res.status(200).json({
    branches,
    allBranches,
    best,
    worst,
    totalEvaluations,
    openProblems: totalOpenProblems,
    resolvedProblems: totalResolvedProblems,
    inProgressProblems,
    problemsBreakdown: { generalProblems: openProblems, cameraIssues: openCameraIssues, socialComplaints: openSocialComplaints },
    unreadNotifications,
    avgOverall: avgOverall ? Math.round(avgOverall * 10) / 10 : 0,
    sectionAverages,
    visitsTrend,
    recentEvaluations,
    recentProblems,
    recentAlerts,
  });
}

export default requireAuth(handler, 'view_dashboard');
