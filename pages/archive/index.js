import { TbFilter } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_archive');
}

function colorFor(percent) {
  if (percent >= 85) return '#16a34a';
  if (percent >= 70) return '#eab308';
  if (percent >= 50) return '#f97316';
  return '#dc2626';
}

export default function Archive({ user }) {
  const [evaluations, setEvaluations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const canRestore = (user.permissions || []).includes('manage_archive');
  const canDelete = (user.permissions || []).includes('delete_evaluations');

  function load() {
    const qs = branchFilter ? `?archived=1&branch_id=${branchFilter}` : '?archived=1';
    fetch(`/api/evaluations${qs}`).then(r => r.json()).then(d => setEvaluations(d.evaluations || []));
  }
  useEffect(load, [branchFilter]);
  useEffect(() => { fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])); }, []);

  async function restore(id) {
    await fetch(`/api/evaluations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) });
    load();
  }

  async function remove(id) {
    if (!confirm('تأكيد حذف هذا التقرير نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch(`/api/evaluations/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  return (
    <Layout user={user} title="الأرشيف">
      <div className="card">
        <p style={{ color: '#6B7280', fontSize: 13, marginTop: 0 }}>
          التقارير هنا تُنقل تلقائياً بعد مرور 30 يوم على تاريخ الزيارة.
          {canRestore ? ' عندك صلاحية الاستعادة.' : ''}
          {canDelete ? ' عندك صلاحية الحذف النهائي.' : ''}
          {!canRestore && !canDelete ? ' عرض فقط — لا تملك صلاحية حذف/استعادة التقارير.' : ''}
        </p>
        <div className="form-row" style={{ maxWidth: 280 }}>
          <label style={{ display:"flex", alignItems:"center", gap:5 }}><TbFilter size={14}/> فلترة حسب الفرع</label>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">كل الأفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>الفرع</th><th>التاريخ</th><th>الموظف</th><th>النتيجة</th><th>تاريخ الأرشفة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {evaluations.map(e => (
                <tr key={e.id}>
                  <td>{e.branch_name}</td>
                  <td>{e.visit_date}</td>
                  <td>{e.inspector_name}</td>
                  <td><span className="badge" style={{ background: colorFor(e.overall_score) }}>{e.overall_score}%</span></td>
                  <td>{e.archived_at?.slice(0, 10) || '—'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link href={`/evaluations/${e.id}`} className="btn btn-sm btn-outline">عرض</Link>
                    {canRestore && <button className="btn btn-sm btn-outline" onClick={() => restore(e.id)}>استعادة</button>}
                    {canDelete && <button className="btn btn-sm btn-danger" onClick={() => remove(e.id)}>حذف نهائي</button>}
                  </td>
                </tr>
              ))}
              {evaluations.length === 0 && <tr><td colSpan={6}>لا توجد تقارير مؤرشفة</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
