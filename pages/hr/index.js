import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbFilter } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_hr');
}

export default function HR({ user }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [form, setForm] = useState({ user_id: '', type: 'إجازة', title: '', details: '', start_date: '', end_date: '' });

  function load() {
    const qs = `${userFilter ? `?user_id=${userFilter}` : ''}${branchFilter ? `${userFilter ? '&' : '?'}branch_id=${branchFilter}` : ''}`;
    fetch(`/api/hr-records${qs}`).then(r => r.json()).then(d => setRecords(d.records || []));
  }
  useEffect(load, [userFilter, branchFilter]);
  useEffect(() => { 
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || []));
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.user_id) return;
    await fetch('/api/hr-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ user_id: '', type: 'إجازة', title: '', details: '', start_date: '', end_date: '' });
    load();
  }

  async function toggleStatus(r) {
    await fetch(`/api/hr-records/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: r.status === 'قائم' ? 'مغلق' : 'قائم' }) });
    load();
  }

  async function remove(id) {
    if (!confirm('حذف هذا السجل؟')) return;
    await fetch(`/api/hr-records/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout user={user} title="الموارد البشرية">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>سجل موظفين</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>الاسم</th><th>اليوزر</th><th>الجوال</th><th>الرقم الوظيفي</th><th>الصلاحية</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.username}</td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.employee_id || '—'}</td>
                  <td>{u.role === 'admin' ? 'مدير النظام' : 'موظف'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>إضافة سجل (إجازة / إنذار / تقييم أداء / ملاحظة)</h3>
        <form onSubmit={submit}>
          <div className="grid grid-3">
            <div className="form-row">
              <label>الموظف</label>
              <select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
                <option value="">اختر الموظف</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>نوع السجل</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>إجازة</option><option>إنذار</option><option>تقييم أداء</option><option>ملاحظة عامة</option>
              </select>
            </div>
            <div className="form-row"><label>عنوان مختصر</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-row"><label>من تاريخ</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="form-row"><label>إلى تاريخ</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            <div className="form-row"><label>تفاصيل</label><input value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} /></div>
          </div>
          <button className="btn">حفظ السجل</button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="form-row" style={{ maxWidth: 240 }}>
            <label style={{ display:'flex', alignItems:'center', gap:5 }}><TbFilter size={14}/> فلترة حسب الموظف</label>
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}>
              <option value="">كل الموظفين</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div className="form-row" style={{ maxWidth: 240 }}>
            <label style={{ display:'flex', alignItems:'center', gap:5 }}><TbFilter size={14}/> فلترة حسب الفرع</label>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">كل الأفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <table>
          <thead><tr><th>الموظف</th><th>النوع</th><th>العنوان</th><th>الفترة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{r.user_name}</td>
                <td>{r.type}</td>
                <td>{r.title || '—'}</td>
                <td>{r.start_date || '—'} {r.end_date ? `→ ${r.end_date}` : ''}</td>
                <td><span className="badge" style={{ background: r.status === 'قائم' ? '#F59E0B' : '#10B981' }}>{r.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleStatus(r)}>{r.status === 'قائم' ? 'إغلاق' : 'إعادة فتح'}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={6}>لا توجد سجلات</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
