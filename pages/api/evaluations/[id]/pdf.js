const db = require('../../../../lib/db');
const { requireAuth } = require('../../../../lib/auth');
const { htmlToPdfBuffer } = require('../../../../lib/pdf');

function colorFor(percent) {
  if (percent >= 85) return '#16a34a';
  if (percent >= 70) return '#ca8a04';
  if (percent >= 50) return '#ea580c';
  return '#dc2626';
}

function buildHtml({ evaluation, items, problems }) {
  const itemsRows = items.map(it => `
    <tr>
      <td>${it.section_name}</td>
      <td style="color:${it.score < it.min_score ? '#dc2626' : '#16a34a'};font-weight:700;">${it.score}/5</td>
      <td>${it.note || '—'}</td>
    </tr>
  `).join('');

  const problemsRows = problems.map(p => `
    <tr><td>${p.source}</td><td>${p.description}</td><td>${p.status === 'resolved' ? 'تم الحل' : 'قائمة'}</td></tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Tajawal', sans-serif; padding: 10px 20px; color: #181B2A; direction: rtl; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #E5E9F0; padding: 8px 10px; text-align: right; font-size: 13px; }
      th { background: #FFF3EA; color: #378ADD; }
      h1 { color: #378ADD; font-size: 24px; margin: 0; }
      h3 { font-size: 16px; margin-bottom: 10px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #378ADD; padding-bottom: 14px; margin-bottom: 20px; }
      .score { font-size: 32px; font-weight: 900; text-align: center; }
      .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #9CA3AF; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>تقرير تقييم فرع</h1>
        <div style="color:#6B7280;font-size:13px;">AzBerry AOP · نظام تقييم الأفرع</div>
      </div>
      <div>
        <div class="score" style="color:${colorFor(evaluation.overall_score)}">${evaluation.overall_score}%</div>
        <div style="font-size:11px;color:#6B7280;text-align:center;">التقييم العام</div>
      </div>
    </div>

    <table>
      <tr><th style="width:140px;">الفرع</th><td>${evaluation.branch_name}</td><th style="width:140px;">تاريخ الزيارة</th><td>${evaluation.visit_date}</td></tr>
      <tr><th>الموظف المسؤول</th><td>${evaluation.inspector_name}</td><th>المدينة</th><td>${evaluation.city || '—'}</td></tr>
    </table>

    <h3>تفاصيل تقييم الأقسام</h3>
    <table>
      <thead><tr><th>القسم</th><th style="width:90px;">الدرجة (من 5)</th><th>ملاحظات</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    ${evaluation.general_notes ? `
      <h3>ملاحظات عامة</h3>
      <p style="background:#F7FAFF;padding:12px;border-radius:8px;font-size:13px;line-height:1.8;">${evaluation.general_notes}</p>
    ` : ''}

    ${problems.length ? `
      <h3>المشاكل المرصودة أثناء الزيارة</h3>
      <table>
        <thead><tr><th>المصدر</th><th>الوصف</th><th style="width:90px;">الحالة</th></tr></thead>
        <tbody>${problemsRows}</tbody>
      </table>
    ` : ''}

    <div class="footer">تم إنشاء هذا التقرير تلقائياً بواسطة نظام AzBerry AOP</div>
  </body>
  </html>
  `;
}

async function handler(req, res) {
  const { id } = req.query;

  const evaluation = db.prepare(`
    SELECT e.*, b.name as branch_name, b.city, u.full_name as inspector_name
    FROM evaluations e
    JOIN branches b ON b.id = e.branch_id
    JOIN users u ON u.id = e.inspector_id
    WHERE e.id = ?
  `).get(id);
  if (!evaluation) return res.status(404).json({ error: 'التقييم غير موجود' });

  const items = db.prepare(`
    SELECT ei.*, s.name as section_name, s.min_score
    FROM evaluation_items ei JOIN sections s ON s.id = ei.section_id
    WHERE ei.evaluation_id = ?
  `).all(id);

  const problems = db.prepare('SELECT * FROM problems WHERE evaluation_id = ?').all(id);

  try {
    const html = buildHtml({ evaluation, items, problems });
    // نرسل HTML مع content-type يجعل المتصفح يعرضه ويسمح بطباعته كـ PDF
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="evaluation-${id}.html"`);
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).json({ error: 'خطأ في توليد التقرير' });
  }
}

export default requireAuth(handler, 'view_evaluations');
