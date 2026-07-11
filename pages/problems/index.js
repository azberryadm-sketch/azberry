import { TbFilter } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_problems');
}

export default function Problems({ user }) {
  const router = useRouter();
  const { highlight, branch_id: branchFilterFromUrl } = router.query;
  const [problems, setProblems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ branch_id: '', source: '', description: '' });
  const [activeProblem, setActiveProblem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [sources, setSources] = useState([]);
  const [newSource, setNewSource] = useState('');
  const canManage = (user.permissions || []).includes('manage_problems');
  const canManageDropdowns = (user.permissions || []).includes('manage_dropdowns');

  function loadSources() {
    fetch('/api/dropdown-options?list_key=problem_sources').then(r => r.json()).then(d => setSources(d.options || []));
  }

  async function addSource() {
    if (!newSource.trim()) return;
    await fetch('/api/dropdown-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ list_key: 'problem_sources', value: newSource.trim() }) });
    setNewSource('');
    loadSources();
  }

  function load() {
    const qs = filter === 'all' ? '' : `?status=${filter}`;
    fetch(`/api/problems${qs}`).then(r => r.json()).then(d => {
      let list = d.problems || [];
      if (branchFilterFromUrl) list = list.filter(p => `${p.branch_id}` === `${branchFilterFromUrl}`);
      setProblems(list);
    });
  }
  useEffect(load, [filter, branchFilterFromUrl]);
  useEffect(() => { fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])); loadSources(); }, []);

  // فتح المشكلة تلقائياً لو جاء رابط من الداشبورد بمعرف محدد
  useEffect(() => {
    if (highlight && problems.length) {
      const found = problems.find(p => `${p.id}` === `${highlight}`);
      if (found) setActiveProblem(found);
    }
  }, [highlight, problems]);

  async function addProblem(e) {
    e.preventDefault();
    if (!form.branch_id || !form.description.trim()) return;
    await fetch('/api/problems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ branch_id: '', source: '', description: '' });
    load();
  }

  async function changeStatus(p, status) {
    await fetch(`/api/problems/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setActiveProblem(null);
    load();
  }

  function openProblem(p) {
    setActiveProblem(p);
    setEditMode(false);
    setEditForm({ branch_id: p.branch_id, source: p.source, description: p.description });
  }

  async function saveEdit() {
    await fetch(`/api/problems/${activeProblem.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setActiveProblem(null);
    setEditMode(false);
    load();
  }

  return (
    <Layout user={user} title="متابعة المشاكل">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>تسجيل مشكلة جديدة</h3>
        <form onSubmit={addProblem}>
          <div className="grid grid-3">
            <div className="form-row">
              <label>الفرع</label>
              <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>المصدر</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option value="">اختر المصدر</option>
                {sources.map(s => <option key={s.id} value={s.value}>{s.value}</option>)}
              </select>
            </div>
            <div className="form-row"><label>الوصف</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <button className="btn">تسجيل المشكلة</button>
        </form>
      </div>

      {canManageDropdowns && (
        <div className="card">
          <h4 style={{ marginTop: 0 }}>إضافة مصدر جديد لقائمة "مصادر المشاكل"</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="مثال: مراجعة العملاء" />
            <button type="button" className="btn btn-sm" onClick={addSource}>إضافة</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${filter === 'all' ? '' : 'btn-outline'}`} onClick={() => setFilter('all')}>الكل</button>
          <button className={`btn btn-sm ${filter === 'open' ? '' : 'btn-outline'}`} onClick={() => setFilter('open')}>مستمرة</button>
          <button className={`btn btn-sm ${filter === 'resolved' ? '' : 'btn-outline'}`} onClick={() => setFilter('resolved')}>مقفلة</button>
          {branchFilterFromUrl && (
            <button className="btn btn-sm btn-outline" onClick={() => router.push('/problems')}>✕ إلغاء فلترة الفرع</button>
          )}
        </div>
        <table>
          <thead><tr><th>الفرع</th><th>المصدر</th><th>الوصف</th><th>تاريخ الرصد</th><th>الحالة</th></tr></thead>
          <tbody>
            {problems.map(p => (
              <tr key={p.id} onClick={() => openProblem(p)} style={{ cursor: 'pointer' }}>
                <td>{p.branch_name}</td>
                <td>{p.source}</td>
                <td>{p.description}</td>
                <td>{p.created_at?.slice(0, 10)}</td>
                <td><span className="badge" style={{ background: p.status === 'resolved' ? '#10B981' : '#EF4444' }}>{p.status === 'resolved' ? 'مقفلة' : 'مستمرة'}</span></td>
              </tr>
            ))}
            {problems.length === 0 && <tr><td colSpan={5}>لا توجد مشاكل في هذه القائمة</td></tr>}
          </tbody>
        </table>
      </div>

      {activeProblem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,27,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setActiveProblem(null)}>
          <div className="card" style={{ width: 420, margin: 0 }} onClick={e => e.stopPropagation()}>
            {!editMode ? (
              <>
                <h3 style={{ marginTop: 0 }}>{activeProblem.branch_name}</h3>
                <p style={{ color: '#6B7280', fontSize: 13 }}>المصدر: {activeProblem.source}</p>
                <p style={{ marginBottom: 20 }}>{activeProblem.description}</p>
                {canManage ? (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <button className="btn" style={{ flex: 1, background: 'linear-gradient(135deg,#F87171,#EF4444)' }} onClick={() => changeStatus(activeProblem, 'open')}>مستمرة</button>
                      <button className="btn" style={{ flex: 1, background: 'linear-gradient(135deg,#34D399,#10B981)' }} onClick={() => changeStatus(activeProblem, 'resolved')}>مقفلة</button>
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => setEditMode(true)}>تعديل بيانات المشكلة</button>
                  </>
                ) : (
                  <p style={{ fontSize: 12.5, color: '#9CA3AF' }}>لا تملك صلاحية تعديل المشاكل.</p>
                )}
                <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setActiveProblem(null)}>إغلاق</button>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>تعديل المشكلة</h3>
                <div className="form-row">
                  <label>الفرع</label>
                  <select value={editForm.branch_id} onChange={e => setEditForm({ ...editForm, branch_id: e.target.value })}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>المصدر</label>
                  <select value={editForm.source} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                    {sources.map(s => <option key={s.id} value={s.value}>{s.value}</option>)}
                  </select>
                </div>
                <div className="form-row"><label>الوصف</label><input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditMode(false)}>إلغاء</button>
                  <button className="btn" style={{ flex: 1 }} onClick={saveEdit}>حفظ</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
