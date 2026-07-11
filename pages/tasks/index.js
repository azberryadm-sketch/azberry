import { TbFilter } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_tasks');
}

const statuses = ['جديدة', 'قيد التنفيذ', 'مكتملة'];
const statusColor = { 'جديدة': '#3b82f6', 'قيد التنفيذ': '#F59E0B', 'مكتملة': '#10B981' };
const priorityColor = { 'عالية': '#EF4444', 'متوسطة': '#F59E0B', 'منخفضة': '#10B981' };

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const canManage = (user.permissions || []).includes('manage_tasks');
  const [form, setForm] = useState({ title: '', description: '', branch_id: '', assigned_to: '', priority: 'متوسطة', due_date: '' });

  function load() {
    fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks || []));
  }
  useEffect(load, []);
  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
    if (canManage) {
      fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || []));
    }
  }, [canManage]);

  const filteredTasks = branchFilter ? tasks.filter(t => String(t.branch_id) === branchFilter) : tasks;

  async function submit(e) {
    e.preventDefault();
    if (!form.title || !form.assigned_to) return;
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ title: '', description: '', branch_id: '', assigned_to: '', priority: 'متوسطة', due_date: '' });
    load();
  }

  async function changeStatus(t, status) {
    await fetch(`/api/tasks/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  }

  async function remove(id) {
    if (!confirm('حذف هذه المهمة؟')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout user={user} title="المهام والتاسكات">
      <div className="card">
        <div className="form-row" style={{ maxWidth: 280, marginBottom: 0 }}>
          <label style={{ display:"flex", alignItems:"center", gap:5 }}><TbFilter size={14}/> فلترة حسب الفرع</label>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">كل الأفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {canManage && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>إسناد مهمة جديدة</h3>
          <form onSubmit={submit}>
            <div className="grid grid-3">
              <div className="form-row"><label>عنوان المهمة</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="form-row">
                <label>الموظف المسؤول</label>
                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">اختر الموظف</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>الفرع (اختياري)</label>
                <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="">بدون فرع محدد</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>الأولوية</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option>عالية</option><option>متوسطة</option><option>منخفضة</option>
                </select>
              </div>
              <div className="form-row"><label>تاريخ الاستحقاق</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div className="form-row"><label>تفاصيل</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <button className="btn">إسناد المهمة</button>
          </form>
        </div>
      )}

      <div className="grid grid-3">
        {statuses.map(status => (
          <div className="card" key={status}>
            <h4 style={{ marginTop: 0, color: statusColor[status] }}>{status} ({filteredTasks.filter(t => t.status === status).length})</h4>
            {filteredTasks.filter(t => t.status === status).map(t => (
              <div key={t.id} style={{ background: '#F7FAFF', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <strong style={{ fontSize: 13.5 }}>{t.title}</strong>
                  <span className="badge" style={{ background: priorityColor[t.priority] }}>{t.priority}</span>
                </div>
                {t.description && <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0' }}>{t.description}</p>}
                <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>
                  {t.assigned_name && <div><TbUser size={13} style={{marginLeft:4}}/> {t.assigned_name}</div>}
                  {t.branch_name && <div><TbBuildingStore size={13} style={{marginLeft:4}}/> {t.branch_name}</div>}
                  {t.due_date && <div>📅 {t.due_date}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {statuses.filter(s => s !== status).map(s => (
                    <button key={s} className="btn btn-sm btn-outline" onClick={() => changeStatus(t, s)}>نقل إلى: {s}</button>
                  ))}
                  {canManage && <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>حذف</button>}
                </div>
              </div>
            ))}
            {filteredTasks.filter(t => t.status === status).length === 0 && <p style={{ color: '#9CA3AF', fontSize: 13 }}>لا توجد مهام</p>}
          </div>
        ))}
      </div>
    </Layout>
  );
}
