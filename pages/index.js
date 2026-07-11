import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { requirePageAuth } from '../lib/pageAuth';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TbBuildingStore, TbClipboardList, TbAlertTriangle, TbStar, TbFilter } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_dashboard');
}

function colorFor(percent) {
  if (percent === null || percent === undefined) return '#9CA3AF';
  if (percent >= 85) return '#10B981';
  if (percent >= 70) return '#F59E0B';
  if (percent >= 50) return '#0369A1';
  return '#EF4444';
}

const circleStats = [
  { key: 'branchesCount', label: 'إجمالي الفروع', Icon: TbBuildingStore, color: '#0369A1', delta: '+12%' },
  { key: 'totalEvaluations', label: 'إجمالي الزيارات', Icon: TbClipboardList, color: '#9F1239', delta: '+8%' },
  { key: 'openProblems', label: 'إجمالي المشاكل', Icon: TbAlertTriangle, color: '#9D6B72', delta: '+45%' },
  { key: 'avgOverall', label: 'متوسط التقييم', Icon: TbStar, color: '#38BDF8', delta: '+0.2%' },
];

export default function Dashboard({ user }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const qs = selectedBranches.length ? `?branch_ids=${selectedBranches.join(',')}` : '';
    fetch(`/api/dashboard/summary${qs}`).then(r => r.json()).then(setData);
  }, [selectedBranches]);

  function toggleBranchFilter(id) {
    setSelectedBranches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  if (!data) return <Layout user={user} title="لوحة التحكم"><p>جاري التحميل...</p></Layout>;

  const problemDonut = [
    { name: 'مفتوحة', value: data.openProblems, color: '#EF4444' },
    { name: 'قيد المعالجة', value: data.inProgressProblems, color: '#F59E0B' },
    { name: 'مغلقة', value: data.resolvedProblems, color: '#10B981' },
  ];
  const totalProblems = problemDonut.reduce((s, p) => s + p.value, 0);

  return (
    <Layout user={user} title="لوحة التحكم">
      <div className="card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><TbFilter size={16} /> فلترة العرض:</strong>
            {selectedBranches.length === 0 ? (
              <span className="badge" style={{ background: '#6B7280' }}>كل الأفرع</span>
            ) : (
              data.allBranches.filter(b => selectedBranches.includes(b.id)).map(b => (
                <span key={b.id} className="badge" style={{ background: '#0369A1', cursor: 'pointer' }} onClick={() => toggleBranchFilter(b.id)}>
                  {b.name} ✕
                </span>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedBranches.length > 0 && (
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedBranches([])}>إعادة تعيين</button>
            )}
            <button className="btn btn-sm" onClick={() => setShowFilter(v => !v)}>{showFilter ? 'إغلاق القائمة' : 'اختيار أفرع'}</button>
          </div>
        </div>

        {showFilter && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(24,27,42,0.06)', display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
            {data.allBranches.map(b => (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'auto', background: selectedBranches.includes(b.id) ? '#FFF3EA' : '#F7FAFF', padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(24,27,42,0.08)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={selectedBranches.includes(b.id)} onChange={() => toggleBranchFilter(b.id)} />
                {b.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-4">
        {circleStats.map((s, i) => {
          const value = s.key === 'branchesCount' ? data.branches.length : data[s.key];
          const display = s.key === 'avgOverall' ? value : value;
          return (
            <div className="card circle-stat" key={s.key} style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="ring" style={{ background: `linear-gradient(135deg, ${s.color}CC, ${s.color})` }}><s.Icon size={22} color="#fff" /></div>
              <div>
                <div className="value">{display}{s.key === 'avgOverall' ? '' : ''}</div>
                <div className="label">{s.label}</div>
                <div className={`delta ${s.delta.startsWith('+') ? 'up' : 'down'}`}>{s.delta} من الشهر الماضي</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-3">
        <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
          <h4>الزيارات خلال آخر 7 أيام</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.visitsTrend}>
              <defs>
                <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0369A1" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0369A1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#0369A1" strokeWidth={2.5} fill="url(#visitGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/problems')}>
          <h4>توزيع المشاكل <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(اضغط لعرض الكل)</span></h4>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={problemDonut} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={3}>
                  {problemDonut.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <div className="num">{totalProblems}</div>
              <div className="txt">إجمالي المشاكل</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {problemDonut.map(p => (
              <div className="legend-item" key={p.name}>
                <span className="legend-dot" style={{ background: p.color }} />
                <span>{p.name}</span>
                <span style={{ marginRight: 'auto', fontWeight: 800 }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>الزيارات الأخيرة</h4>
          {data.recentEvaluations.map(e => (
            <div className="mini-row" key={e.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/evaluations/${e.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="mini-avatar">🏬</div>
                <div>
                  <div className="mini-title">{e.branch_name}</div>
                  <div className="mini-sub">{e.visit_date}</div>
                </div>
              </div>
              <span className="badge" style={{ background: colorFor(e.overall_score) }}>{e.overall_score}%</span>
            </div>
          ))}
          {data.recentEvaluations.length === 0 && <div className="empty-state">لا توجد زيارات بعد</div>}
        </div>

        <div className="card">
          <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>أحدث المشاكل</h4>
          {data.recentProblems.map(p => (
            <div className="mini-row" key={p.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/problems?highlight=${p.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="mini-avatar" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>⚠️</div>
                <div>
                  <div className="mini-title">{p.description.slice(0, 22)}{p.description.length > 22 ? '…' : ''}</div>
                  <div className="mini-sub">{p.branch_name}</div>
                </div>
              </div>
              <span className="badge" style={{ background: p.status === 'resolved' ? '#10B981' : '#EF4444' }}>{p.status === 'resolved' ? 'مغلقة' : 'مفتوحة'}</span>
            </div>
          ))}
          {data.recentProblems.length === 0 && <div className="empty-state">لا توجد مشاكل مسجلة</div>}
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => router.push('/notifications')}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>تنبيهات فورية <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>(اضغط لعرض الكل)</span></h4>
          {data.recentAlerts.map((a, i) => (
            <div className="alert-row" key={i}>
              <div className="alert-icon" style={{ background: a.level === 'danger' ? '#EF4444' : a.level === 'warning' ? '#F59E0B' : '#3b82f6' }}>!</div>
              <div>{a.message}</div>
            </div>
          ))}
          {data.recentAlerts.length === 0 && <div className="empty-state">لا توجد تنبيهات</div>}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>ترند الفروع (من الأعلى للأقل تقييماً)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>#</th><th>الفرع</th><th>الزيارات</th><th>آخر زيارة</th><th>متوسط التقييم</th></tr></thead>
              <tbody>
                {[...data.branches].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0)).map((b, i) => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/evaluations?branch_id=${b.id}`)}>
                    <td>
                      <span style={{ fontWeight: 700, color: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7F32' : 'var(--muted)', fontSize: 15 }}>
                        {i === 0 ? '①' : i === 1 ? '②' : i === 2 ? '③' : i + 1}
                      </span>
                    </td>
                    <td>{b.name}</td>
                    <td>{b.visits_count}</td>
                    <td>{b.last_visit ? b.last_visit.slice(0, 10) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                        <div className="score-bar" style={{ flex: 1 }}>
                          <div style={{ width: `${b.avg_score || 0}%`, background: colorFor(b.avg_score) }} />
                        </div>
                        <span className="badge" style={{ background: colorFor(b.avg_score) }}>
                          {b.avg_score ? Math.round(b.avg_score) + '%' : 'لا يوجد'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card chart-card">
          <h4>تقييم الفروع</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.branches.slice(0, 6)}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="avg_score" radius={[8, 8, 0, 0]} fill="#0369A1" cursor="pointer" onClick={(d) => router.push(`/evaluations?branch_id=${d.id}`)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(user.permissions || []).includes('manage_camera_notes') && (
        <div className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => router.push('/camera-dashboard')}>
          <div>
            <h4 style={{ margin: 0 }}>داشبورد الكاميرات</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#6B7280' }}>ترند الأفرع حسب المخالفات، وفلترة حسب نوع المخالفة (مثل مشاكل المطبخ)</p>
          </div>
          <span className="btn btn-sm btn-outline">فتح ←</span>
        </div>
      )}
    </Layout>
  );
}
