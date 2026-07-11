import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbFilter } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context);
}

export default function Announcements({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [readFilter, setReadFilter] = useState('all');
  const canManage = (user.permissions || []).includes('manage_announcements');
  const [form, setForm] = useState({ title: '', message: '', target_user_id: '' });

  function load() {
    fetch('/api/announcements').then(r => r.json()).then(d => setAnnouncements(d.announcements || []));
  }
  useEffect(load, []);
  useEffect(() => { if (canManage) fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])); }, [canManage]);

  const filteredAnnouncements = announcements.filter(a => {
    if (readFilter === 'unread') return !a.is_read;
    if (readFilter === 'read') return !!a.is_read;
    return true;
  });

  async function submit(e) {
    e.preventDefault();
    if (!form.title || !form.message) return;
    await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ title: '', message: '', target_user_id: '' });
    load();
  }

  async function markRead(id) {
    await fetch(`/api/announcements/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mark_read: true }) });
    load();
  }

  async function sendWhatsapp(a) {
    const target = users.find(u => u.id === a.target_user_id);
    if (!target?.phone) return alert('لا يوجد رقم جوال مسجل لهذا الموظف');
    const text = `📣 ${a.title}\n\n${a.message}`;
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: target.phone, message: text }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'فشل الإرسال');
    await fetch(`/api/announcements/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mark_whatsapp_sent: true }) });
    alert('تم الإرسال عبر واتساب بنجاح ✅');
    load();
  }

  return (
    <Layout user={user} title="التبليغات">
      {canManage && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>إرسال تبليغ جديد</h3>
          <p style={{ color: '#6B7280', fontSize: 13 }}>يظهر التبليغ داخل النظام لكل الموظفين (أو موظف محدد)، وتقدر ترسله كمان على واتساب مباشرة بضغطة زر.</p>
          <form onSubmit={submit}>
            <div className="grid grid-3">
              <div className="form-row"><label>العنوان</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="form-row">
                <label>لمن (اتركها فارغة = للجميع)</label>
                <select value={form.target_user_id} onChange={e => setForm({ ...form, target_user_id: e.target.value })}>
                  <option value="">كل الموظفين</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="form-row"><label>نص الرسالة</label><input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
            </div>
            <button className="btn">إرسال التبليغ</button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <TbFilter size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <button className={`btn btn-sm ${readFilter === 'all' ? '' : 'btn-outline'}`} onClick={() => setReadFilter('all')}>الكل</button>
          <button className={`btn btn-sm ${readFilter === 'unread' ? '' : 'btn-outline'}`} onClick={() => setReadFilter('unread')}>غير مقروءة</button>
          <button className={`btn btn-sm ${readFilter === 'read' ? '' : 'btn-outline'}`} onClick={() => setReadFilter('read')}>مقروءة</button>
        </div>
        {filteredAnnouncements.map(a => (
          <div key={a.id} style={{ background: a.is_read ? '#fff' : '#FFF3EA', border: '1px solid rgba(24,27,42,0.06)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{a.title}</strong>
                <p style={{ margin: '6px 0', fontSize: 13.5 }}>{a.message}</p>
                <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>
                  {a.target_name ? `خاص بـ: ${a.target_name}` : 'للجميع'} · {a.created_at?.slice(0, 16)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {!a.is_read && <button className="btn btn-sm btn-outline" onClick={() => markRead(a.id)}>وضع كمقروء</button>}
                {canManage && a.target_user_id && (
                  <button className="btn btn-sm" style={{ background: '#25D366' }} onClick={() => sendWhatsapp(a)}>
                    📲 إرسال واتساب
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredAnnouncements.length === 0 && <p style={{ color: '#9CA3AF' }}>لا توجد تبليغات</p>}
      </div>
    </Layout>
  );
}
