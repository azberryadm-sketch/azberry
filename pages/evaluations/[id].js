import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_evaluations');
}

function colorFor(percent) {
  if (percent >= 85) return '#16a34a';
  if (percent >= 70) return '#eab308';
  if (percent >= 50) return '#f97316';
  return '#dc2626';
}

export default function EvaluationDetail({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const canDelete = (user.permissions || []).includes('delete_evaluations');

  useEffect(() => {
    if (id) fetch(`/api/evaluations/${id}`).then(r => r.json()).then(setData);
  }, [id]);

  async function removeEvaluation() {
    if (!confirm('تأكيد حذف هذا التقرير نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const res = await fetch(`/api/evaluations/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'حدث خطأ'); return; }
    router.push('/evaluations');
  }

  if (!data || !data.evaluation) return <Layout user={user} title="تفاصيل التقييم"><p>جاري التحميل...</p></Layout>;
  const { evaluation, items, problems } = data;

  return (
    <Layout user={user} title={`تقييم فرع ${evaluation.branch_name}`}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p><strong>الفرع:</strong> {evaluation.branch_name}</p>
            <p><strong>التاريخ:</strong> {evaluation.visit_date}</p>
            <p><strong>الموظف:</strong> {evaluation.inspector_name}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 'bold', color: colorFor(evaluation.overall_score) }}>{evaluation.overall_score}%</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a className="btn btn-sm" href={`/api/evaluations/${id}/pdf`} target="_blank" rel="noreferrer">تحميل PDF</a>
              <a className="btn btn-sm btn-outline" href={`/evaluations/print/${id}`} target="_blank" rel="noreferrer">طباعة يدوية</a>
              {canDelete && <button className="btn btn-sm btn-danger" onClick={removeEvaluation}>حذف التقرير</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>درجات الأقسام</h3>
        <table>
          <thead><tr><th>القسم</th><th>الدرجة</th><th>ملاحظة</th><th>صور/فيديو</th></tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td>{it.section_name}</td>
                <td><span className="badge" style={{ background: it.score < it.min_score ? '#dc2626' : '#16a34a' }}>{it.score}/5</span></td>
                <td>{it.note || '—'}</td>
                <td>
                  {(() => {
                    let mediaList = [];
                    try { mediaList = JSON.parse(it.media_paths || '[]'); } catch (e) { mediaList = []; }
                    if (mediaList.length === 0 && it.photo_path) mediaList = [{ type: 'image', path: it.photo_path }];
                    if (mediaList.length === 0) return '—';
                    return (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {mediaList.map((m, i) => (
                          <a key={i} href={m.path} target="_blank" rel="noreferrer">
                            {m.type === 'video' ? (
                              <video src={m.path} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                            ) : (
                              <img src={m.path} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                            )}
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {evaluation.general_notes && (
        <div className="card"><h3 style={{ marginTop: 0 }}>ملاحظات عامة</h3><p>{evaluation.general_notes}</p></div>
      )}

      {problems.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>المشاكل المرصودة</h3>
          <table>
            <thead><tr><th>المصدر</th><th>الوصف</th><th>الحالة</th></tr></thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.id}>
                  <td>{p.source}</td>
                  <td>{p.description}</td>
                  <td><span className="badge" style={{ background: p.status === 'resolved' ? '#16a34a' : '#dc2626' }}>{p.status === 'resolved' ? 'تم الحل' : 'قائمة'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
