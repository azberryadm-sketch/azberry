import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbPlus, TbTrash, TbLock, TbLockOpen, TbCalendar } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_performance_sessions');
}

const emptyForm = { title: '', start_at: '', end_at: '' };

export default function PerformanceSessions({ user }) {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);

  function load() {
    fetch('/api/performance-sessions').then(r => r.json()).then(d => setSessions(d.sessions || []));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    await fetch('/api/performance-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm(emptyForm);
    setAdding(false);
    load();
  }

  async function remove(id) {
    if (!confirm('حذف هذه الدورة؟')) return;
    await fetch(`/api/performance-sessions?id=${id}`, { method: 'DELETE' });
    load();
  }

  function statusBadge(s) {
    if (s === 'open') return <span className="badge" style={{ background: '#10B981' }}>مفتوحة الآن</span>;
    if (s === 'closed') return <span className="badge" style={{ background: '#9D6B72' }}>مغلقة</span>;
    return <span className="badge" style={{ background: '#F59E0B' }}>لم تبدأ بعد</span>;
  }

  return (
    <Layout user={user} title="دورات تقييم الأداء الوظيفي">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>دورات التقييم</h3>
          <button className="btn" onClick={() => setAdding(!adding)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TbPlus size={16} /> دورة جديدة
          </button>
        </div>

        {adding && (
          <form onSubmit={submit} style={{ marginTop: 16, padding: 16, background: '#FFF1F2', borderRadius: 12, border: '1px solid #FECDD3' }}>
            <div className="grid grid-3">
              <div className="form-row">
                <label>عنوان الدورة *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثال: تقييم يوليو 2026" required />
              </div>
              <div className="form-row">
                <label>تاريخ ووقت البداية *</label>
                <input type="datetime-local" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>تاريخ ووقت الانتهاء *</label>
                <input type="datetime-local" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn" type="submit">حفظ الدورة</button>
              <button className="btn btn-outline" type="button" onClick={() => setAdding(false)}>إلغاء</button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>عنوان الدورة</th>
              <th>بداية</th>
              <th>نهاية</th>
              <th>الحالة</th>
              <th>أُنشئت بواسطة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td style={{ fontSize: 12.5 }}>{s.start_at?.replace('T', ' ')}</td>
                <td style={{ fontSize: 12.5 }}>{s.end_at?.replace('T', ' ')}</td>
                <td>{statusBadge(s.status)}</td>
                <td>{s.created_by_name}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>
                    <TbTrash size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>لا توجد دورات بعد</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
