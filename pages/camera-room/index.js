import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbCamera, TbPaperclip, TbAlertTriangle, TbPlus } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_camera_notes');
}

const emptyForm = {
  branch_id: '', job_title: '', employee_name: '', camera_time: '', report_date: new Date().toISOString().slice(0, 10),
  camera_location: '', camera_location_other: '', violation: '', violation_other: '', description: '',
};

export default function CameraRoom({ user }) {
  const [branches, setBranches] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [violations, setViolations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
    fetch('/api/dropdown-options?list_key=job_titles').then(r => r.json()).then(d => setJobTitles(d.options || []));
    fetch('/api/dropdown-options?list_key=camera_locations').then(r => r.json()).then(d => setLocations(d.options || []));
    fetch('/api/dropdown-options?list_key=violation_types').then(r => r.json()).then(d => setViolations(d.options || []));
  }, []);

  async function handleMedia(files) {
    const list = Array.from(files || []).slice(0, 5 - media.length);
    for (const file of list) {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      await new Promise(resolve => {
        reader.onload = async () => {
          const tempId = Math.random().toString(36).slice(2);
          setMedia(m => [...m, { tempId, preview: reader.result, type: isVideo ? 'video' : 'image', uploading: true }]);
          const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: reader.result, mime: file.type }) });
          const data = await res.json();
          setMedia(m => m.map(item => item.tempId === tempId ? { ...item, uploading: false, path: data.path } : item));
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.branch_id || !form.camera_location || !form.violation) return alert('الفرع والكاميرا والمخالفة مطلوبة');
    setSubmitting(true);
    const payload = {
      ...form,
      camera_location: form.camera_location === 'أخرى' ? form.camera_location_other : form.camera_location,
      violation: form.violation === 'أخرى' ? form.violation_other : form.violation,
      media_paths: media.filter(m => m.path).map(m => ({ type: m.type, path: m.path })),
    };
    await fetch('/api/camera-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setForm(emptyForm);
    setMedia([]);
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <Layout user={user} title="رفع بلاغ كاميرا">
      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 12, padding: 14, marginBottom: 16, color: '#059669', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TbAlertTriangle size={18} /> تم إرسال البلاغ بنجاح
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><TbCamera size={20} /> تسجيل بلاغ مخالفة جديد</h3>
        <form onSubmit={submit}>
          <div className="grid grid-3">
            <div className="form-row">
              <label>اسم الفرع *</label>
              <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} required>
                <option value="">اختيار</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>المسمى الوظيفي</label>
              <select value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })}>
                <option value="">اختيار</option>
                {jobTitles.map(j => <option key={j.id} value={j.value}>{j.value}</option>)}
              </select>
            </div>
            <div className="form-row"><label>اسم الموظف</label><input value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} /></div>
            <div className="form-row"><label>وقت الكاميرة *</label><input type="time" value={form.camera_time} onChange={e => setForm({ ...form, camera_time: e.target.value })} required /></div>
            <div className="form-row"><label>التاريخ *</label><input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} required /></div>
          </div>

          <div className="form-row">
            <label>موقع الكاميرة *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {locations.map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: form.camera_location === l.value ? 'rgba(3,105,161,0.1)' : '#F7FAFF', padding: '6px 12px', borderRadius: 20, border: `1px solid ${form.camera_location === l.value ? '#0369A1' : '#E5E7EB'}`, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="camera_location" style={{ width: 'auto' }} checked={form.camera_location === l.value} onChange={() => setForm({ ...form, camera_location: l.value })} />
                  {l.value}
                </label>
              ))}
            </div>
            {form.camera_location === 'أخرى' && <input style={{ marginTop: 8 }} placeholder="حدد الموقع" value={form.camera_location_other} onChange={e => setForm({ ...form, camera_location_other: e.target.value })} />}
          </div>

          <div className="form-row">
            <label>نوع المخالفة *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {violations.map(v => (
                <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: form.violation === v.value ? 'rgba(159,18,57,0.1)' : '#F7FAFF', padding: '6px 12px', borderRadius: 20, border: `1px solid ${form.violation === v.value ? '#9F1239' : '#E5E7EB'}`, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="violation" style={{ width: 'auto' }} checked={form.violation === v.value} onChange={() => setForm({ ...form, violation: v.value })} />
                  {v.value}
                </label>
              ))}
            </div>
            {form.violation === 'أخرى' && <input style={{ marginTop: 8 }} placeholder="حدد المخالفة" value={form.violation_other} onChange={e => setForm({ ...form, violation_other: e.target.value })} />}
          </div>

          <div className="form-row"><label>الملاحظات (اختياري)</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TbPaperclip size={15} /> إرفاق صورة أو فيديو (حتى 5 ملفات)</label>
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TbPlus size={15} /> إضافة ملف
              <input type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleMedia(e.target.files)} disabled={media.length >= 5} />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {media.map(m => (
                <div key={m.tempId} style={{ position: 'relative', width: 64, height: 64 }}>
                  {m.type === 'video'
                    ? <video src={m.preview} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid #eee' }} />
                    : <img src={m.preview} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid #eee' }} />}
                  {m.uploading && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>جاري الرفع...</span>}
                  <button type="button" onClick={() => setMedia(prev => prev.filter(x => x.tempId !== m.tempId))} style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <button className="btn" disabled={submitting}>{submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}</button>
        </form>
      </div>
    </Layout>
  );
}
