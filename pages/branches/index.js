import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_branches');
}

export default function Branches({ user }) {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', city: '', address: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/branches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm({ name: '', code: '', city: '', address: '' });
    load();
  }

  async function toggleActive(b) {
    await fetch(`/api/branches/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...b, active: b.active ? 0 : 1 }),
    });
    load();
  }

  async function remove(id) {
    if (!confirm('تأكيد حذف الفرع؟')) return;
    await fetch(`/api/branches/${id}`, { method: 'DELETE' });
    load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch(`/api/branches/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    load();
  }

  return (
    <Layout user={user} title="إدارة الأفرع">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>إضافة فرع جديد</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid grid-4">
            <div className="form-row"><label>اسم الفرع *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-row"><label>رمز الفرع</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="form-row"><label>المدينة</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div className="form-row"><label>العنوان</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <button className="btn">إضافة الفرع</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>قائمة الأفرع ({branches.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>الاسم</th><th>الرمز</th><th>المدينة</th><th>العنوان</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.code || '—'}</td>
                  <td>{b.city || '—'}</td>
                  <td>{b.address || '—'}</td>
                  <td><span className="badge" style={{ background: b.active ? '#16a34a' : '#9CA3AF' }}>{b.active ? 'نشط' : 'موقوف'}</span></td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(b)}>تعديل</button>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleActive(b)}>{b.active ? 'إيقاف' : 'تفعيل'}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(b.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,27,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditing(null)}>
          <form className="card" style={{ width: 420, margin: 0 }} onClick={e => e.stopPropagation()} onSubmit={saveEdit}>
            <h3 style={{ marginTop: 0 }}>تعديل بيانات الفرع</h3>
            <div className="form-row"><label>اسم الفرع</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required /></div>
            <div className="form-row"><label>رمز الفرع</label><input value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value })} /></div>
            <div className="form-row"><label>المدينة</label><input value={editing.city || ''} onChange={e => setEditing({ ...editing, city: e.target.value })} /></div>
            <div className="form-row"><label>العنوان</label><input value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(null)}>إلغاء</button>
              <button className="btn" style={{ flex: 1 }}>حفظ التعديلات</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
