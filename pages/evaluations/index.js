import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function EvaluationsList({ user }) {
  const router = useRouter();
  const { branch_id } = router.query;
  const [evaluations, setEvaluations] = useState([]);
  const [branchName, setBranchName] = useState('');
  const [cameraNotes, setCameraNotes] = useState(null); // null = لا صلاحية أو لا يوجد
  const [socialComplaints, setSocialComplaints] = useState(null);
  const [branchProblems, setBranchProblems] = useState(null);

  useEffect(() => {
    const url = branch_id ? `/api/evaluations?branch_id=${branch_id}` : '/api/evaluations';
    fetch(url).then(r => r.json()).then(d => {
      setEvaluations(d.evaluations || []);
      if (d.evaluations?.length) setBranchName(d.evaluations[0].branch_name);
    });

    if (branch_id) {
      fetch(`/api/camera-notes?branch_id=${branch_id}`).then(r => r.ok ? r.json() : null).then(d => setCameraNotes(d?.notes || [])).catch(() => setCameraNotes(null));
      fetch(`/api/social-complaints?branch_id=${branch_id}`).then(r => r.ok ? r.json() : null).then(d => setSocialComplaints(d?.complaints || [])).catch(() => setSocialComplaints(null));
      fetch(`/api/problems?branch_id=${branch_id}`).then(r => r.ok ? r.json() : null).then(d => setBranchProblems(d?.problems || [])).catch(() => setBranchProblems(null));
    } else {
      setCameraNotes(null);
      setSocialComplaints(null);
      setBranchProblems(null);
    }
  }, [branch_id]);

  return (
    <Layout user={user} title={branch_id ? `تقارير فرع ${branchName}` : 'سجل التقييمات'}>
      {branch_id && (
        <button className="btn btn-sm btn-outline" style={{ marginBottom: 14 }} onClick={() => router.push('/evaluations')}>✕ عرض كل الأفرع</button>
      )}
      <div className="card">
        <table>
          <thead><tr><th>الفرع</th><th>التاريخ</th><th>الموظف</th><th>النتيجة</th><th></th></tr></thead>
          <tbody>
            {evaluations.map(e => (
              <tr key={e.id}>
                <td>{e.branch_name}</td>
                <td>{e.visit_date}</td>
                <td>{e.inspector_name}</td>
                <td><span className="badge" style={{ background: colorFor(e.overall_score) }}>{e.overall_score}%</span></td>
                <td><Link href={`/evaluations/${e.id}`} className="btn btn-sm btn-outline">التفاصيل</Link></td>
              </tr>
            ))}
            {evaluations.length === 0 && <tr><td colSpan={5}>لا توجد تقييمات بعد</td></tr>}
          </tbody>
        </table>
      </div>

      {branch_id && branchProblems && branchProblems.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>مشاكل هذا الفرع</h3>
          <table>
            <thead><tr><th>المصدر</th><th>الوصف</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
              {branchProblems.map(p => (
                <tr key={p.id}>
                  <td>{p.source}</td>
                  <td>{p.description}</td>
                  <td><span className="badge" style={{ background: p.status === 'resolved' ? '#16a34a' : '#dc2626' }}>{p.status === 'resolved' ? 'مقفلة' : 'مستمرة'}</span></td>
                  <td>{p.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {branch_id && cameraNotes && cameraNotes.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>ملاحظات الكاميرات</h3>
          <table>
            <thead><tr><th>العنوان</th><th>التفاصيل</th><th>التاريخ</th></tr></thead>
            <tbody>
              {cameraNotes.map(n => (
                <tr key={n.id}><td>{n.title || '—'}</td><td>{n.description}</td><td>{n.created_at?.slice(0, 10)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {branch_id && socialComplaints && socialComplaints.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>شكاوى الزبائن</h3>
          <table>
            <thead><tr><th>المنصة</th><th>نص الشكوى</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
              {socialComplaints.map(c => (
                <tr key={c.id}>
                  <td>{c.platform || '—'}</td>
                  <td>{c.complaint_text}</td>
                  <td><span className="badge" style={{ background: c.status === 'resolved' ? '#16a34a' : '#dc2626' }}>{c.status === 'resolved' ? 'تم الحل' : 'قائمة'}</span></td>
                  <td>{c.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
