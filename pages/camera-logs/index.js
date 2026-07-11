import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbFilter, TbVideo, TbCheck, TbX } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_camera_logs');
}

export default function CameraLogs({ user }) {
  const [notes, setNotes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    const qs = branchFilter ? `?branch_id=${branchFilter}` : '';
    fetch(`/api/camera-notes${qs}`).then(r => r.json()).then(d => {
      let list = d.notes || [];
      if (statusFilter) list = list.filter(n => (n.status || 'مفتوحة') === statusFilter);
      setNotes(list);
    });
  }
  useEffect(load, [branchFilter, statusFilter]);
  useEffect(() => { fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])); }, []);

  async function toggleStatus(n) {
    await fetch(`/api/camera-notes/${n.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: n.status === 'مغلقة' ? 'مفتوحة' : 'مغلقة' }) });
    load();
  }

  async function remove(id) {
    if (!confirm('حذف هذا البلاغ؟')) return;
    await fetch(`/api/camera-notes/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout user={user} title="سجل بلاغات الكاميرات">
      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <TbFilter size={16} style={{ color: 'var(--primary)' }} />
          <div className="form-row" style={{ margin: 0, minWidth: 200 }}>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">كل الأفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-row" style={{ margin: 0, minWidth: 160 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">كل الحالات</option>
              <option value="مفتوحة">مفتوحة</option>
              <option value="مغلقة">مغلقة</option>
            </select>
          </div>
        </div>
      </div>
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>الفرع</th><th>الموظف</th><th>الكاميرا</th><th>المخالفة</th><th>الملفات</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>
              {notes.map(n => {
                let mediaList = [];
                try { mediaList = JSON.parse(n.media_paths || '[]'); } catch (e) {}
                return (
                  <tr key={n.id}>
                    <td><Link href={`/evaluations?branch_id=${n.branch_id}`}>{n.branch_name}</Link></td>
                    <td style={{ fontSize: 12.5 }}>{n.employee_name || '—'}{n.job_title ? ` (${n.job_title})` : ''}</td>
                    <td>{n.camera_location}</td>
                    <td style={{ maxWidth: 160, fontSize: 12.5 }}>{n.violation}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {mediaList.map((m, i) => (
                          m.type === 'video'
                            ? <a key={i} href={m.path} download target="_blank" rel="noreferrer">
                                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(3,105,161,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <TbVideo size={16} color="#0369A1" />
                                </div>
                              </a>
                            : <a key={i} href={m.path} target="_blank" rel="noreferrer">
                                <img src={m.path} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                              </a>
                        ))}
                        {mediaList.length === 0 && '—'}
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: n.status === 'مغلقة' ? '#10B981' : '#E11D48' }}>{n.status || 'مفتوحة'}</span></td>
                    <td>{n.report_date || n.created_at?.slice(0, 10)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => toggleStatus(n)}>
                          {n.status === 'مغلقة' ? <TbX size={14} /> : <TbCheck size={14} />}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(n.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {notes.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>لا توجد بلاغات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
