import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_sections');
}

export default function Sections({ user }) {
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', min_score: 3, category: 'عام' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/sections').then(r => r.json()).then(d => setSections(d.sections || []));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm({ name: '', description: '', min_score: 3, category: 'عام' });
    load();
  }

  async function remove(id) {
    if (!confirm('تأكيد إيقاف هذا القسم من نماذج التقييم القادمة؟')) return;
    await fetch(`/api/sections/${id}`, { method: 'DELETE' });
    load();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await fetch(`/api/sections/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setEditing(null);
    load();
  }

  return (
    <Layout user={user} title="أقسام / بنود التقييم">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>إضافة قسم تقييم جديد</h3>
        <p style={{ color: '#6b7280', fontSize: 13 }}>أي قسم تضيفه هنا يظهر تلقائياً بنموذج التقييم لكل الموظفين. صنّفه "ماركتنك" إذا تبيه يظهر بداشبورد فريق الماركتنك المنفصل.</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid grid-4">
            <div className="form-row"><label>اسم القسم *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-row"><label>وصف مختصر</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-row">
              <label>الحد الأدنى المقبول (من 5)</label>
              <input type="number" min="1" max="5" step="0.5" value={form.min_score} onChange={e => setForm({ ...form, min_score: e.target.value })} />
            </div>
            <div className="form-row">
              <label>التصنيف</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="عام">عام</option>
                <option value="ماركتنك">ماركتنك</option>
              </select>
            </div>
          </div>
          <button className="btn">إضافة القسم</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>الأقسام الحالية ({sections.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>القسم</th><th>الوصف</th><th>الحد الأدنى</th><th>التصنيف</th><th>إجراءات</th></tr></thead>
            <tbody>
              {sections.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.description || '—'}</td>
                  <td>{s.min_score}</td>
                  <td><span className="badge" style={{ background: s.category === 'ماركتنك' ? '#8B5CF6' : '#6B7280' }}>{s.category || 'عام'}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(s)}>تعديل</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(s.id)}>إيقاف</button>
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
            <h3 style={{ marginTop: 0 }}>تعديل القسم</h3>
            <div className="form-row"><label>اسم القسم</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required /></div>
            <div className="form-row"><label>وصف مختصر</label><input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="form-row"><label>الحد الأدنى المقبول (من 5)</label><input type="number" min="1" max="5" step="0.5" value={editing.min_score} onChange={e => setEditing({ ...editing, min_score: e.target.value })} /></div>
            <div className="form-row">
              <label>التصنيف</label>
              <select value={editing.category || 'عام'} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                <option value="عام">عام</option>
                <option value="ماركتنك">ماركتنك</option>
              </select>
            </div>
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
