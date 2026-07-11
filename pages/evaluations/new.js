import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_evaluations');
}

export default function NewEvaluation({ user }) {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [problemSources, setProblemSources] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [media, setMedia] = useState({}); // { sectionId: [{ preview, type, uploading, path }] }
  const [generalNotes, setGeneralNotes] = useState('');
  const [problems, setProblems] = useState([{ source: '', description: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || []));
    fetch('/api/sections').then(r => r.json()).then(d => setSections(d.sections || []));
    fetch('/api/dropdown-options?list_key=problem_sources').then(r => r.json()).then(d => setProblemSources(d.options || []));
  }, []);

  function setScore(sectionId, val) {
    setScores(s => ({ ...s, [sectionId]: val }));
  }
  function setNote(sectionId, val) {
    setNotes(n => ({ ...n, [sectionId]: val }));
  }

  // يدعم رفع أكثر من صورة + فيديو لنفس القسم
  async function handleMedia(sectionId, files) {
    const list = Array.from(files || []);
    for (const file of list) {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      await new Promise(resolve => {
        reader.onload = async () => {
          const tempId = Math.random().toString(36).slice(2);
          setMedia(m => ({ ...m, [sectionId]: [...(m[sectionId] || []), { tempId, preview: reader.result, type: isVideo ? 'video' : 'image', uploading: true }] }));
          const res = await fetch('/api/upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: reader.result, mime: file.type }),
          });
          const data = await res.json();
          setMedia(m => ({
            ...m,
            [sectionId]: (m[sectionId] || []).map(item => item.tempId === tempId ? { ...item, uploading: false, path: data.path } : item),
          }));
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function removeMedia(sectionId, tempId) {
    setMedia(m => ({ ...m, [sectionId]: (m[sectionId] || []).filter(item => item.tempId !== tempId) }));
  }

  function addProblem() {
    setProblems(p => [...p, { source: '', description: '' }]);
  }
  function updateProblem(i, field, val) {
    setProblems(p => p.map((pr, idx) => (idx === i ? { ...pr, [field]: val } : pr)));
  }
  function removeProblem(i) {
    setProblems(p => p.filter((_, idx) => idx !== i));
  }

  const currentTotal = sections.reduce((sum, s) => sum + Number(scores[s.id] || 0), 0);
  const currentPercent = sections.length ? Math.round((currentTotal / (sections.length * 5)) * 100) : 0;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!branchId) return setError('الرجاء اختيار الفرع');
    const missing = sections.some(s => !scores[s.id]);
    if (missing) return setError('الرجاء تقييم كل الأقسام قبل الإرسال');

    setSubmitting(true);
    const items = sections.map(s => {
      const sectionMedia = (media[s.id] || []).filter(m => m.path).map(m => ({ type: m.type, path: m.path }));
      return {
        section_id: s.id,
        score: Number(scores[s.id]),
        note: notes[s.id] || '',
        photo_path: sectionMedia.find(m => m.type === 'image')?.path || null, // توافق مع النسخة القديمة
        media_paths: sectionMedia,
      };
    });
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        visit_date: visitDate,
        items,
        general_notes: generalNotes,
        problems: problems.filter(p => p.description.trim()),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error || 'حدث خطأ');
    router.push(`/evaluations/${data.id}`);
  }

  return (
    <Layout user={user} title="تقييم زيارة فرع جديدة">
      <form onSubmit={submit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="card">
          <div className="grid grid-2">
            <div className="form-row">
              <label>الفرع *</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} required>
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>تاريخ الزيارة *</label>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} required />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>تقييم الأقسام (الدرجة من 1 إلى 5)</h3>
          {sections.map(s => (
            <div key={s.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <strong>{s.name}</strong>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(s.id, n)}
                      className="btn btn-sm"
                      style={{
                        background: Number(scores[s.id]) === n ? (n === 0 ? '#EF4444' : '#378ADD') : '#f3f4f6',
                        color: Number(scores[s.id]) === n ? '#fff' : '#374151',
                        width: 34, fontWeight: n === 0 ? 700 : 400,
                      }}
                    >{n === 0 ? '✗' : n}</button>
                  ))}
                </div>
              </div>
              <input placeholder="ملاحظة على هذا القسم (اختياري)" value={notes[s.id] || ''} onChange={e => setNote(s.id, e.target.value)} />
              <div style={{ marginTop: 8 }}>
                <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex' }}>
                  إرفاق صور/فيديو
                  <input type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleMedia(s.id, e.target.files)} />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {(media[s.id] || []).map(m => (
                    <div key={m.tempId} style={{ position: 'relative', width: 56, height: 56 }}>
                      {m.type === 'video' ? (
                        <video src={m.preview} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }} />
                      ) : (
                        <img src={m.preview} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }} />
                      )}
                      {m.uploading && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, textAlign: 'center' }}>جاري الرفع</span>}
                      <button type="button" onClick={() => removeMedia(s.id, m.tempId)} style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {sections.length > 0 && (
            <div style={{ marginTop: 14, fontWeight: 'bold' }}>النسبة الحالية للتقييم: {currentPercent}%</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>ملاحظات عامة</h3>
          <textarea rows={3} value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} placeholder="ملاحظات إضافية عن الزيارة..." />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>المشاكل المرصودة (اختياري)</h3>
          {problems.map((p, i) => (
            <div key={i} className="grid" style={{ gridTemplateColumns: '200px 1fr auto', gap: 8, marginBottom: 8 }}>
              <select value={p.source} onChange={e => updateProblem(i, 'source', e.target.value)}>
                <option value="">اختر المصدر</option>
                {problemSources.map(s => <option key={s.id} value={s.value}>{s.value}</option>)}
              </select>
              <input placeholder="وصف المشكلة" value={p.description} onChange={e => updateProblem(i, 'description', e.target.value)} />
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeProblem(i)}>حذف</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={addProblem}>+ إضافة مشكلة أخرى</button>
        </div>

        <button className="btn" disabled={submitting}>{submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}</button>
      </form>
    </Layout>
  );
}
