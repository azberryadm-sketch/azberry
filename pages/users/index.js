import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_users');
}

const emptyForm = { username: '', password: '', full_name: '', phone: '', employee_id: '', email: '', role: 'inspector', branch_ids: [] };

export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || []));
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
    fetch('/api/permissions').then(r => r.json()).then(d => setAllPermissions(d.permissions || []));
  }
  useEffect(load, []);

  function toggleBranch(id, target = 'form') {
    if (target === 'form') {
      setForm(f => ({ ...f, branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter(x => x !== id) : [...f.branch_ids, id] }));
    } else {
      setEditing(f => {
        const current = f.branch_ids || f.branches?.map(b => b.id) || [];
        const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
        return { ...f, branch_ids: next };
      });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(emptyForm);
    load();
  }

  async function toggleActive(u) {
    await fetch(`/api/users/${u.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: u.full_name, phone: u.phone, employee_id: u.employee_id, email: u.email, role: u.role, active: u.active ? 0 : 1 }),
    });
    load();
  }

  async function remove(id) {
    if (!confirm('تأكيد حذف الموظف؟')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    load();
  }

  function togglePermission(key) {
    setEditing(f => {
      const current = f.permissionsList || JSON.parse(f.permissions || '[]');
      const next = current.includes(key) ? current.filter(x => x !== key) : [...current, key];
      return { ...f, permissionsList: next };
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    const payload = {
      username: editing.username,
      full_name: editing.full_name,
      phone: editing.phone,
      employee_id: editing.employee_id,
      email: editing.email,
      role: editing.role,
      active: editing.active,
      password: editing.newPassword || undefined,
      branch_ids: editing.branch_ids || editing.branches?.map(b => b.id) || [],
      permissions: editing.permissionsList || JSON.parse(editing.permissions || '[]'),
    };
    const res = await fetch(`/api/users/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'حدث خطأ'); return; }
    setEditing(null);
    load();
  }

  return (
    <Layout user={user} title="إدارة المستخدمين والصلاحيات">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>إضافة موظف جديد</h3>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid grid-3">
            <div className="form-row"><label>الاسم الكامل *</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="form-row"><label>اسم المستخدم (يوزر) *</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
            <div className="form-row"><label>كلمة المرور *</label><input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>
            <div className="form-row"><label>رقم الجوال</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-row"><label>الرقم الوظيفي</label><input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} /></div>
            <div className="form-row"><label>البريد الإلكتروني</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-row">
              <label>الصلاحية</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="inspector">موظف تقييم زيارات</option>
                <option value="admin">مدير النظام (كل الصلاحيات)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>الأفرع المخصصة له (اتركها فارغة ليرى كل الأفرع)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {branches.map(b => (
                <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'auto', background: form.branch_ids.includes(b.id) ? '#FFF3EA' : '#f9fafb', padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={form.branch_ids.includes(b.id)} onChange={() => toggleBranch(b.id, 'form')} />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn">إضافة الموظف</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>قائمة المستخدمين ({users.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>الاسم</th><th>اليوزر</th><th>الرقم الوظيفي</th><th>الصلاحية</th><th>الأفرع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.username}</td>
                  <td>{u.employee_id || '—'}</td>
                  <td>{u.role === 'admin' ? 'مدير النظام' : 'موظف تقييم'}</td>
                  <td>{u.branches.length ? u.branches.map(b => b.name).join('، ') : 'كل الأفرع'}</td>
                  <td><span className="badge" style={{ background: u.active ? '#16a34a' : '#9CA3AF' }}>{u.active ? 'نشط' : 'موقوف'}</span></td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing({ ...u, newPassword: '' })}>تعديل</button>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleActive(u)}>{u.active ? 'إيقاف' : 'تفعيل'}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(u.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,27,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setEditing(null)}>
          <form className="card" style={{ width: 460, margin: 0, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} onSubmit={saveEdit}>
            <h3 style={{ marginTop: 0 }}>تعديل بيانات الموظف</h3>
            <div className="form-row"><label>الاسم الكامل</label><input value={editing.full_name} onChange={e => setEditing({ ...editing, full_name: e.target.value })} required /></div>
            <div className="form-row"><label>اسم المستخدم (يوزر)</label><input value={editing.username} onChange={e => setEditing({ ...editing, username: e.target.value })} required /></div>
            <div className="form-row"><label>كلمة مرور جديدة (اتركها فارغة لعدم التغيير)</label><input value={editing.newPassword} onChange={e => setEditing({ ...editing, newPassword: e.target.value })} placeholder="••••••••" /></div>
            <div className="form-row"><label>رقم الجوال</label><input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="form-row"><label>الرقم الوظيفي</label><input value={editing.employee_id || ''} onChange={e => setEditing({ ...editing, employee_id: e.target.value })} /></div>
            <div className="form-row"><label>البريد الإلكتروني</label><input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
            <div className="form-row">
              <label>الصلاحية</label>
              <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
                <option value="inspector">موظف تقييم زيارات</option>
                <option value="admin">مدير النظام (كل الصلاحيات)</option>
              </select>
            </div>
            <div className="form-row">
              <label>الأفرع المخصصة له</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {branches.map(b => {
                  const activeIds = editing.branch_ids || editing.branches?.map(x => x.id) || [];
                  return (
                    <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'auto', background: activeIds.includes(b.id) ? '#FFF3EA' : '#f9fafb', padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: 'auto' }} checked={activeIds.includes(b.id)} onChange={() => toggleBranch(b.id, 'editing')} />
                      {b.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {editing.role !== 'admin' && (
              <div className="form-row">
                <label>الصلاحيات الدقيقة (تتحكم بها انت بالكامل)</label>
                {Object.entries(allPermissions.reduce((acc, p) => {
                  acc[p.grp] = acc[p.grp] || [];
                  acc[p.grp].push(p);
                  return acc;
                }, {})).map(([group, perms]) => (
                  <div key={group} style={{ marginBottom: 10, background: '#F7FAFF', padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#378ADD', marginBottom: 6 }}>{group}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {perms.map(p => {
                        const activePerms = editing.permissionsList || JSON.parse(editing.permissions || '[]');
                        return (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'auto', background: activePerms.includes(p.key) ? '#FFE3C9' : '#fff', padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 12.5 }}>
                            <input type="checkbox" style={{ width: 'auto' }} checked={activePerms.includes(p.key)} onChange={() => togglePermission(p.key)} />
                            {p.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {editing.role === 'admin' && (
              <p style={{ fontSize: 12.5, color: '#6B7280', background: '#F7FAFF', padding: 10, borderRadius: 10 }}>مدير النظام يملك كل الصلاحيات تلقائياً.</p>
            )}
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
