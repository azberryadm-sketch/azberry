import { TbFilter } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_social_complaints');
}

const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function dayFromDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return dayNames[d.getDay()];
}

const emptyForm = { branch_id: '', complaint_date: new Date().toISOString().slice(0, 10), problem_type: '', complaint_text: '', platform: '', compensation: '', notified: false };

export default function SocialComplaints({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [branches, setBranches] = useState([]);
  const [problemTypes, setProblemTypes] = useState([]);
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [branchFilter, setBranchFilter] = useState('');
  const canManageDropdowns = (user.permissions || []).includes('manage_dropdowns');

  function load() {
    const qs = branchFilter ? `?branch_id=${branchFilter}` : '';
    fetch(`/api/social-complaints${qs}`).then(r => r.json()).then(d => setComplaints(d.complaints || []));
  }
  function loadLists() {
    fetch('/api/dropdown-options?list_key=complaint_problem_types').then(r => r.json()).then(d => setProblemTypes(d.options || []));
    fetch('/api/dropdown-options?list_key=complaint_sources').then(r => r.json()).then(d => setSources(d.options || []));
  }
  useEffect(load, [branchFilter]);
  useEffect(() => { fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])); loadLists(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.branch_id || !form.problem_type) return alert('الفرع ونوع المشكلة مطلوبان');
    await fetch('/api/social-complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm(emptyForm);
    load();
  }

  async function toggleNotified(c) {
    await fetch(`/api/social-complaints/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notified: !c.notified }) });
    load();
  }

  async function editCompensation(c) {
    const val = prompt('التعويض المقدّم (مثال: 4 سلاشات):', c.compensation || '');
    if (val === null) return;
    await fetch(`/api/social-complaints/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compensation: val }) });
    load();
  }

  async function remove(id) {
    if (!confirm('حذف هذه الشكوى؟')) return;
    await fetch(`/api/social-complaints/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout user={user} title="شكاوى الزبائن">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>تسجيل شكوى جديدة</h3>
        <p style={{ color: '#6B7280', fontSize: 13 }}>ترتبط تلقائياً بتقارير الفرع المختار، فيصير تقييم الفرع شامل كل الأقسام.</p>
        <form onSubmit={submit}>
          <div className="grid grid-3">
            <div className="form-row"><label>التاريخ</label><input type="date" value={form.complaint_date} onChange={e => setForm({ ...form, complaint_date: e.target.value })} /></div>
            <div className="form-row">
              <label>الفرع</label>
              <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>المشكلة</label>
              <select value={form.problem_type} onChange={e => setForm({ ...form, problem_type: e.target.value })}>
                <option value="">اختر المشكلة</option>
                {problemTypes.map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>المصدر</label>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                <option value="">اختر المصدر</option>
                {sources.map(s => <option key={s.id} value={s.value}>{s.value}</option>)}
              </select>
            </div>
            <div className="form-row"><label>التفاصيل</label><input value={form.complaint_text} onChange={e => setForm({ ...form, complaint_text: e.target.value })} /></div>
            <div className="form-row"><label>التعويض (اختياري)</label><input placeholder="مثال: 4 سلاشات" value={form.compensation} onChange={e => setForm({ ...form, compensation: e.target.value })} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto', marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.notified} onChange={e => setForm({ ...form, notified: e.target.checked })} />
            تم التبليغ
          </label>
          <button className="btn">حفظ الشكوى</button>
        </form>
      </div>

      {canManageDropdowns && (
        <div className="grid grid-2">
          <QuickAddList label="أنواع المشاكل" listKey="complaint_problem_types" onAdded={loadLists} />
          <QuickAddList label="مصادر الشكاوى" listKey="complaint_sources" onAdded={loadLists} />
        </div>
      )}

      <div className="card">
        <div className="form-row" style={{ maxWidth: 280 }}>
          <label style={{ display:"flex", alignItems:"center", gap:5 }}><TbFilter size={14}/> فلترة حسب الفرع</label>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">كل الأفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>التاريخ</th><th>اليوم</th><th>المشكلة</th><th>التفاصيل</th><th>المصدر</th><th>الفرع</th><th>التعويض</th><th>التبليغ</th><th></th></tr></thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td>{c.complaint_date}</td>
                  <td>{dayFromDate(c.complaint_date)}</td>
                  <td>{c.problem_type}</td>
                  <td>{c.complaint_text || '—'}</td>
                  <td>{c.platform || '—'}</td>
                  <td><Link href={`/evaluations?branch_id=${c.branch_id}`}>{c.branch_name}</Link></td>
                  <td onClick={() => editCompensation(c)} style={{ cursor: 'pointer', color: c.compensation ? '#181B2A' : '#9CA3AF', fontWeight: c.compensation ? 700 : 400 }}>{c.compensation || 'إضافة...'}</td>
                  <td>
                    <input type="checkbox" checked={!!c.notified} onChange={() => toggleNotified(c)} style={{ width: 18, height: 18 }} />
                  </td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>حذف</button></td>
                </tr>
              ))}
              {complaints.length === 0 && <tr><td colSpan={9}>لا توجد شكاوى</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function QuickAddList({ label, listKey, onAdded }) {
  const [value, setValue] = useState('');
  async function add() {
    if (!value.trim()) return;
    await fetch('/api/dropdown-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ list_key: listKey, value: value.trim() }) });
    setValue('');
    onAdded();
  }
  return (
    <div className="card">
      <h4 style={{ marginTop: 0, fontSize: 13 }}>إضافة إلى: {label}</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={value} onChange={e => setValue(e.target.value)} placeholder="قيمة جديدة" />
        <button type="button" className="btn btn-sm" onClick={add}>إضافة</button>
      </div>
    </div>
  );
}
