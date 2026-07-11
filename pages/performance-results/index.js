import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbFilter, TbPrinter, TbTrash, TbEye } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_performance_results');
}

export default function PerformanceResults({ user }) {
  const [sessions, setSessions] = useState([]);
  const [evals, setEvals] = useState([]);
  const [branches, setBranches] = useState([]);
  const [sessionFilter, setSessionFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetch('/api/performance-sessions').then(r => r.json()).then(d => setSessions(d.sessions || []));
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (sessionFilter) qs.set('session_id', sessionFilter);
    if (branchFilter) qs.set('branch_id', branchFilter);
    fetch(`/api/performance-evals?${qs}`).then(r => r.json()).then(d => setEvals(d.evals || []));
  }, [sessionFilter, branchFilter]);

  async function viewEval(id) {
    const res = await fetch(`/api/performance-evals/${id}`);
    const data = await res.json();
    setSelected(data.eval);
    setSelectedItems(data.items);
  }

  async function remove(id) {
    if (!confirm('حذف هذا التقييم؟')) return;
    await fetch(`/api/performance-evals/${id}`, { method: 'DELETE' });
    setEvals(evals.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function printEval() {
    if (!selected) return;
    const maxTotal = selectedItems.reduce((s, i) => s + i.max_score, 0);
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>تقييم أداء - ${selected.employee_name}</title>
    <style>
      body { font-family: 'Tajawal', Tahoma, sans-serif; margin: 0; padding: 20px; }
      .header { background: linear-gradient(135deg,#7F1D1D,#9F1239); color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
      .header h2 { margin: 0; font-size: 18px; }
      .header p { margin: 4px 0 0; font-size: 12px; color: #FECDD3; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 20px; background: #FFF1F2; border: 1px solid #FECDD3; border-top: none; }
      .info-item label { font-size: 11px; color: #9F1239; display: block; margin-bottom: 3px; }
      .info-item span { font-size: 13px; font-weight: 500; }
      table { width: 100%; border-collapse: collapse; margin: 14px 0; }
      th { background: #9F1239; color: #fff; padding: 8px 10px; text-align: right; font-size: 12px; }
      td { padding: 7px 10px; border-bottom: 1px solid #FECDD3; font-size: 12px; }
      tr:nth-child(even) td { background: #FFF1F2; }
      .total-row td { background: #9F1239 !important; color: #fff; font-weight: 500; }
      .notes { padding: 10px 20px; font-size: 12.5px; border: 1px solid #FECDD3; border-top: none; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <div class="header">
      <div><h2>نموذج تقييم الأداء الوظيفي</h2><p>AzBerry AOP · نظام تقييم الأفرع</p></div>
      <img src="/logo.png" alt="ازبيري" style="height:36px;object-fit:contain;filter:brightness(10);" />
    </div>
    <div class="info-grid">
      <div class="info-item"><label>اسم الموظف</label><span>${selected.employee_name}</span></div>
      <div class="info-item"><label>المسمى الوظيفي</label><span>${selected.job_title || '—'}</span></div>
      <div class="info-item"><label>الفرع</label><span>${selected.branch_name || '—'}</span></div>
      <div class="info-item"><label>اسم المشرف</label><span>${selected.supervisor_name || '—'}</span></div>
      <div class="info-item"><label>تاريخ التقييم</label><span>${selected.eval_date || '—'}</span></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>معيار التقييم</th><th style="text-align:center">العظمى</th><th style="text-align:center">الدرجة</th><th>السبب</th></tr></thead>
      <tbody>
        ${selectedItems.map((item, i) => `<tr><td style="text-align:center;color:#9F1239">${i + 1}</td><td>${item.criterion_name}</td><td style="text-align:center;color:#9F1239">${item.max_score}</td><td style="text-align:center;font-weight:500">${item.score}</td><td>${item.reason || '—'}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="2">مجموع التقييم</td><td style="text-align:center">${maxTotal}</td><td style="text-align:center;font-size:16px">${selected.total_score}</td><td></td></tr>
      </tbody>
    </table>
    ${selected.general_notes ? `<div class="notes"><strong>الملاحظات العامة:</strong><br/>${selected.general_notes}</div>` : ''}
    <script>window.onload=()=>window.print();</script>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  }

  return (
    <Layout user={user} title="نتائج تقييم الأداء الوظيفي">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <TbFilter size={16} style={{ color: 'var(--primary)' }} />
          <div className="form-row" style={{ margin: 0, minWidth: 220 }}>
            <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}>
              <option value="">كل الدورات</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="form-row" style={{ margin: 0, minWidth: 180 }}>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">كل الأفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: 16 }}>
        <div className="card">
          <table>
            <thead><tr><th>الموظف</th><th>الفرع</th><th>المجموع</th><th></th></tr></thead>
            <tbody>
              {evals.map(e => (
                <tr key={e.id} style={{ cursor: 'pointer', background: selected?.id === e.id ? '#FFF1F2' : '' }}>
                  <td onClick={() => viewEval(e.id)}>{e.employee_name}</td>
                  <td onClick={() => viewEval(e.id)} style={{ fontSize: 12.5 }}>{e.branch_name}</td>
                  <td onClick={() => viewEval(e.id)}>
                    <span className="badge" style={{ background: e.total_score >= 80 ? '#10B981' : e.total_score >= 60 ? '#F59E0B' : '#EF4444' }}>
                      {e.total_score}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => viewEval(e.id)}><TbEye size={13} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(e.id)}><TbTrash size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {evals.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>لا توجد تقييمات</td></tr>}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card" style={{ borderTop: '3px solid #9F1239' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: '#9F1239' }}>{selected.employee_name}</h4>
              <button className="btn btn-sm" onClick={printEval} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#9F1239' }}>
                <TbPrinter size={15} /> طباعة PDF
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12.5 }}>
              <div><span style={{ color: 'var(--muted)' }}>الفرع:</span> {selected.branch_name || '—'}</div>
              <div><span style={{ color: 'var(--muted)' }}>المسمى:</span> {selected.job_title || '—'}</div>
              <div><span style={{ color: 'var(--muted)' }}>المشرف:</span> {selected.supervisor_name || '—'}</div>
              <div><span style={{ color: 'var(--muted)' }}>التاريخ:</span> {selected.eval_date}</div>
            </div>
            <table>
              <thead><tr style={{ background: '#9F1239' }}><th style={{ color: '#fff' }}>المعيار</th><th style={{ color: '#fff', textAlign: 'center' }}>العظمى</th><th style={{ color: '#fff', textAlign: 'center' }}>الدرجة</th><th style={{ color: '#fff' }}>السبب</th></tr></thead>
              <tbody>
                {selectedItems.map((item, i) => (
                  <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#FFF1F2' }}>
                    <td style={{ fontSize: 12 }}>{item.criterion_name}</td>
                    <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>{item.max_score}</td>
                    <td style={{ textAlign: 'center', fontWeight: 500, color: '#9F1239' }}>{item.score}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.reason || '—'}</td>
                  </tr>
                ))}
                <tr style={{ background: '#9F1239' }}>
                  <td colSpan={2} style={{ color: '#fff', fontWeight: 500 }}>المجموع</td>
                  <td style={{ textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{selected.total_score}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            {selected.general_notes && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFF1F2', borderRadius: 8, fontSize: 12.5 }}>
                <strong style={{ color: '#9F1239' }}>الملاحظات:</strong> {selected.general_notes}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
