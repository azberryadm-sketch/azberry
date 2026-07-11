import { TbFilter } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_marketing_dashboard');
}

export default function Marketing({ user }) {
  const [data, setData] = useState(null);
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    fetch('/api/marketing/summary').then(r => r.json()).then(setData);
  }, []);

  const filteredRows = data ? (branchFilter ? data.rows.filter(r => r.branch_name === branchFilter) : data.rows) : [];
  const branchNames = data ? [...new Set(data.rows.map(r => r.branch_name))] : [];

  return (
    <Layout user={user} title="داشبورد الماركتنك">
      <div className="card">
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
          يعرض فقط ملاحظات الأقسام المصنّفة "ماركتنك" (مثل: الشاشات، ساين المكائن، المنيو، الشعارات). لإضافة قسم جديد لهذا التصنيف، روح لـ "أقسام التقييم" وحدد التصنيف = ماركتنك عند إنشاء/تعديل القسم.
        </p>
        {data && data.rows.length > 0 && (
          <div className="form-row" style={{ maxWidth: 280, marginBottom: 0 }}>
            <label style={{ display:"flex", alignItems:"center", gap:5 }}><TbFilter size={14}/> فلترة حسب الفرع</label>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">كل الأفرع</option>
              {branchNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>

      {!data ? <p>جاري التحميل...</p> : data.sections.length === 0 ? (
        <div className="card">لا يوجد أي قسم مصنّف "ماركتنك" حالياً. أضف تصنيف لقسم من صفحة أقسام التقييم.</div>
      ) : (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>أحدث الملاحظات ({filteredRows.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>الفرع</th><th>القسم</th><th>الدرجة</th><th>الملاحظة</th><th>صورة</th><th>التاريخ</th></tr></thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.branch_name}</td>
                    <td>{r.section_name}</td>
                    <td><span className="badge" style={{ background: r.score >= 4 ? '#16a34a' : r.score >= 3 ? '#eab308' : '#dc2626' }}>{r.score}/5</span></td>
                    <td>{r.note || '—'}</td>
                    <td>{r.photo_path ? <a href={r.photo_path} target="_blank" rel="noreferrer"><img src={r.photo_path} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} /></a> : '—'}</td>
                    <td>{r.visit_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
