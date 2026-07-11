import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { requirePageAuth } from '../../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_evaluations');
}

function colorFor(percent) {
  if (percent >= 85) return '#16a34a';
  if (percent >= 70) return '#ca8a04';
  if (percent >= 50) return '#ea580c';
  return '#dc2626';
}

// صفحة تقرير قابلة للطباعة/الحفظ كـ PDF مباشرة من المتصفح (تدعم العربية بالكامل RTL)
export default function PrintEvaluation() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (id) fetch(`/api/evaluations/${id}`).then(r => r.json()).then(setData);
  }, [id]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (!data || !data.evaluation) return <div style={{ padding: 40, fontFamily: 'Tajawal' }}>جاري تجهيز التقرير...</div>;
  const { evaluation, items, problems } = data;

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', padding: '30px 40px', maxWidth: 800, margin: '0 auto', color: '#181B2A' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #E5E9F0; padding: 8px 10px; text-align: right; font-size: 13px; }
        th { background: #FFF3EA; color: #378ADD; }
      `}</style>

      <div className="no-print" style={{ textAlign: 'left', marginBottom: 14 }}>
        <button onClick={() => window.print()} style={{ background: '#378ADD', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          🖨️ حفظ كـ PDF / طباعة
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #378ADD', paddingBottom: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, color: '#378ADD', fontSize: 24 }}>تقرير تقييم فرع</h1>
          <div style={{ color: '#6B7280', fontSize: 13 }}>AzBerry AOP · نظام تقييم الأفرع</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: colorFor(evaluation.overall_score) }}>{evaluation.overall_score}%</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>التقييم العام</div>
        </div>
      </div>

      <table style={{ marginBottom: 20 }}>
        <tbody>
          <tr><th style={{ width: 140 }}>الفرع</th><td>{evaluation.branch_name}</td><th style={{ width: 140 }}>تاريخ الزيارة</th><td>{evaluation.visit_date}</td></tr>
          <tr><th>الموظف المسؤول</th><td>{evaluation.inspector_name}</td><th>المدينة</th><td>{evaluation.city || '—'}</td></tr>
        </tbody>
      </table>

      <h3 style={{ color: '#181B2A', fontSize: 16, marginBottom: 10 }}>تفاصيل تقييم الأقسام</h3>
      <table style={{ marginBottom: 20 }}>
        <thead><tr><th>القسم</th><th style={{ width: 90 }}>الدرجة (من 5)</th><th>ملاحظات</th></tr></thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td>{it.section_name}</td>
              <td style={{ color: it.score < it.min_score ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{it.score}/5</td>
              <td>{it.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {evaluation.general_notes && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>ملاحظات عامة</h3>
          <p style={{ background: '#F7FAFF', padding: 12, borderRadius: 8, fontSize: 13, lineHeight: 1.8 }}>{evaluation.general_notes}</p>
        </div>
      )}

      {problems.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>المشاكل المرصودة أثناء الزيارة</h3>
          <table>
            <thead><tr><th>المصدر</th><th>الوصف</th><th style={{ width: 90 }}>الحالة</th></tr></thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.id}><td>{p.source}</td><td>{p.description}</td><td>{p.status === 'resolved' ? 'تم الحل' : 'قائمة'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 30, textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
        تم إنشاء هذا التقرير تلقائياً بواسطة نظام AzBerry AOP — {new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>
  );
}
