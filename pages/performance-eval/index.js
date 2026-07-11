import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'submit_performance_eval');
}

export default function PerformanceEval({ user }) {
  const [sessions, setSessions] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [branches, setBranches] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [scores, setScores] = useState({});
  const [reasons, setReasons] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ employee_name: '', branch_id: '', supervisor_name: user.full_name || '', job_title: '', general_notes: '' });

  useEffect(() => {
    fetch('/api/performance-sessions').then(r => r.json()).then(d => {
      const open = (d.sessions || []).find(s => s.status === 'open');
      setActiveSession(open || null);
      setSessions(d.sessions || []);
    });
    fetch('/api/performance-evals').then(r => r.json()).then(d => setCriteria(d.criteria || []));
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
    fetch('/api/dropdown-options?list_key=job_titles').then(r => r.json()).then(d => setJobTitles(d.options || []));
  }, []);

  const totalScore = criteria.reduce((sum, c) => sum + (Number(scores[c.id]) || 0), 0);
  const maxScore = criteria.reduce((sum, c) => sum + c.max_score, 0);

  async function submit(e) {
    e.preventDefault();
    if (!activeSession) return;
    setSubmitting(true);
    const items = criteria.map(c => ({ criterion_id: c.id, score: Number(scores[c.id]) || 0, reason: reasons[c.id] || '' }));
    const res = await fetch('/api/performance-evals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: activeSession.id, ...form, items }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(true);
      setScores({});
      setReasons({});
      setForm({ employee_name: '', branch_id: '', supervisor_name: user.full_name || '', job_title: '', general_notes: '' });
    } else {
      alert(data.error || 'حدث خطأ');
    }
    setSubmitting(false);
  }

  if (!activeSession) {
    return (
      <Layout user={user} title="تقييم الأداء الوظيفي">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h3>لا توجد دورة تقييم مفتوحة حالياً</h3>
          <p style={{ color: 'var(--muted)' }}>ستُفتح استمارة التقييم عند بدء الدورة المحددة من الإدارة</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} title="تقييم الأداء الوظيفي">
      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 12, padding: 14, marginBottom: 16, color: '#059669', fontWeight: 500 }}>
          ✅ تم إرسال التقييم بنجاح
          <button className="btn btn-sm" style={{ marginRight: 12 }} onClick={() => setSuccess(false)}>تقييم موظف آخر</button>
        </div>
      )}

      {!success && (
        <form onSubmit={submit}>
          <div className="card" style={{ marginBottom: 16, borderTop: '3px solid #9F1239' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: '#9F1239' }}>نموذج تقييم الأداء الوظيفي</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>دورة: {activeSession.title} · حتى {activeSession.end_at?.replace('T', ' ')}</p>
              </div>
              <img src="/logo.png" alt="ازبيري" style={{ height: 40, objectFit: 'contain' }} />
            </div>

            <div className="grid grid-2">
              <div className="form-row">
                <label>اسم الموظف *</label>
                <input value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} placeholder="اسم الموظف" required />
              </div>
              <div className="form-row">
                <label>المسمى الوظيفي</label>
                <select value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })}>
                  <option value="">اختيار</option>
                  {jobTitles.map(j => <option key={j.id} value={j.value}>{j.value}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>الفرع *</label>
                <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} required>
                  <option value="">اختيار الفرع</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>اسم المشرف *</label>
                <input value={form.supervisor_name} onChange={e => setForm({ ...form, supervisor_name: e.target.value })} placeholder="اسم المشرف" required />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: '#9F1239' }}>تقييم الأقسام (المجموع من {maxScore})</h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr style={{ background: '#9F1239' }}>
                    <th style={{ color: '#fff', width: 30 }}>#</th>
                    <th style={{ color: '#fff' }}>معيار التقييم</th>
                    <th style={{ color: '#fff', textAlign: 'center', width: 60 }}>العظمى</th>
                    <th style={{ color: '#fff', textAlign: 'center', width: 80 }}>الدرجة</th>
                    <th style={{ color: '#fff' }}>السبب / الملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#FFF1F2' }}>
                      <td style={{ textAlign: 'center', color: '#9F1239' }}>{i + 1}</td>
                      <td>{c.name}</td>
                      <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{c.max_score}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number" min="0" max={c.max_score}
                          value={scores[c.id] ?? ''}
                          onChange={e => setScores({ ...scores, [c.id]: Math.min(c.max_score, Math.max(0, Number(e.target.value))) })}
                          style={{ width: 52, textAlign: 'center', borderColor: '#FECDD3' }}
                        />
                      </td>
                      <td>
                        <input type="text" placeholder="السبب (اختياري)" value={reasons[c.id] || ''} onChange={e => setReasons({ ...reasons, [c.id]: e.target.value })} style={{ width: '100%', borderColor: '#FECDD3' }} />
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#9F1239' }}>
                    <td colSpan={2} style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>مجموع التقييم</td>
                    <td style={{ textAlign: 'center', color: '#FECDD3' }}>{maxScore}</td>
                    <td style={{ textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{totalScore}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-row">
              <label>الملاحظات العامة</label>
              <textarea rows={3} value={form.general_notes} onChange={e => setForm({ ...form, general_notes: e.target.value })} placeholder="اكتب ملاحظاتك العامة عن الموظف هنا..." />
            </div>
          </div>

          <button className="btn" type="submit" disabled={submitting} style={{ background: '#9F1239', width: '100%', padding: 12, fontSize: 15 }}>
            {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </button>
        </form>
      )}
    </Layout>
  );
}
