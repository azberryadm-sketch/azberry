import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbVideo, TbAlertTriangle, TbCircleCheck, TbFilter } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_camera_notes');
}

export default function CameraDashboard({ user }) {
  const [data, setData] = useState(null);
  const [violations, setViolations] = useState([]);
  const [violationFilter, setViolationFilter] = useState('');

  function load() {
    const qs = violationFilter ? `?violation=${encodeURIComponent(violationFilter)}` : '';
    fetch(`/api/camera-dashboard/summary${qs}`).then(r => r.json()).then(setData);
  }
  useEffect(load, [violationFilter]);
  useEffect(() => { fetch('/api/dropdown-options?list_key=violation_types').then(r => r.json()).then(d => setViolations(d.options || [])); }, []);

  if (!data) return <Layout user={user} title="داشبورد الكاميرات"><p>جاري التحميل...</p></Layout>;

  const maxCount = Math.max(...data.branchRanking.map(b => b.issues_count), 1);

  return (
    <Layout user={user} title="داشبورد الكاميرات">
      <div className="grid grid-3">
        <div className="card stat-card">
          <div className="icon-wrap" style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}><TbVideo size={22} color="#fff" /></div>
          <div className="value">{data.totalIssues}</div>
          <div className="label">إجمالي بلاغات الكاميرات</div>
        </div>
        <div className="card stat-card">
          <div className="icon-wrap" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}><TbAlertTriangle size={22} color="#fff" /></div>
          <div className="value">{data.openIssues}</div>
          <div className="label">بلاغات مفتوحة</div>
        </div>
        <div className="card stat-card">
          <div className="icon-wrap" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}><TbCircleCheck size={22} color="#fff" /></div>
          <div className="value">{data.totalIssues - data.openIssues}</div>
          <div className="label">بلاغات مغلقة</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><TbFilter size={18} /> فلترة حسب نوع المخالفة</h3>
        <p style={{ color: '#6B7280', fontSize: 13 }}>اختر نوع مخالفة (مثلاً مخالفات المطبخ) وشوف ترتيب الأفرع من الأكثر تكراراً للأقل لنفس هالمخالفة بالذات.</p>
        <select value={violationFilter} onChange={e => setViolationFilter(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">كل أنواع المخالفات (الترتيب العام)</option>
          {violations.map(v => <option key={v.id} value={v.value}>{v.value}</option>)}
        </select>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>📊 ترند الأفرع {violationFilter ? `— مخالفة: ${violationFilter}` : '(كل المخالفات)'}</h3>
        {data.branchRanking.length === 0 ? <p style={{ color: '#9CA3AF' }}>لا توجد بيانات</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.branchRanking.map((b, i) => (
              <div key={b.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <Link href={`/evaluations?branch_id=${b.id}`} style={{ fontWeight: 700 }}>
                    {i === 0 && '① '}{i === 1 && '② '}{i === 2 && '③ '}{b.name}
                  </Link>
                  <span>{b.issues_count} مخالفة ({b.open_count} مفتوحة)</span>
                </div>
                <div className="score-bar">
                  <div style={{ width: `${(b.issues_count / maxCount) * 100}%`, background: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : '#8B5CF6' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h4 style={{ marginTop: 0 }}>أكثر أنواع المخالفات تكراراً</h4>
          {data.violationBreakdown.slice(0, 8).map(v => (
            <div key={v.violation} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(24,27,42,0.06)', fontSize: 13 }}>
              <span>{v.violation}</span><strong>{v.count}</strong>
            </div>
          ))}
        </div>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>أكثر مواقع الكاميرا بلاغات</h4>
          {data.locationBreakdown.slice(0, 8).map(l => (
            <div key={l.camera_location} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(24,27,42,0.06)', fontSize: 13 }}>
              <span>{l.camera_location}</span><strong>{l.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>أحدث البلاغات</h4>
        <table>
          <thead><tr><th>الفرع</th><th>المخالفة</th><th>الموقع</th><th>التاريخ</th><th>الحالة</th></tr></thead>
          <tbody>
            {data.recentIssues.map(r => (
              <tr key={r.id}>
                <td>{r.branch_name}</td>
                <td>{r.violation}</td>
                <td>{r.camera_location}</td>
                <td>{r.report_date || r.created_at?.slice(0, 10)}</td>
                <td><span className="badge" style={{ background: r.status === 'مغلقة' ? '#10B981' : '#EF4444' }}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
