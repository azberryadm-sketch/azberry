import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'manage_settings');
}

export default function Settings({ user }) {
  const [permissions, setPermissions] = useState([]);
  const [permForm, setPermForm] = useState({ key: '', label: '', group: 'عام' });
  const [settings, setSettings] = useState({});
  const [settingForm, setSettingForm] = useState({ key: '', value: '' });
  const [waConfig, setWaConfig] = useState(null);
  const [waForm, setWaForm] = useState({ whatsapp_phone_number_id: '', whatsapp_access_token: '', whatsapp_template_name: '' });

  function load() {
    fetch('/api/permissions').then(r => r.json()).then(d => setPermissions(d.permissions || []));
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d.settings || {}));
    fetch('/api/whatsapp/config').then(r => r.json()).then(d => {
      setWaConfig(d);
      setWaForm(f => ({ ...f, whatsapp_phone_number_id: d.config?.whatsapp_phone_number_id || '', whatsapp_template_name: d.config?.whatsapp_template_name || '' }));
    });
  }
  useEffect(load, []);

  async function saveWhatsappConfig(e) {
    e.preventDefault();
    await fetch('/api/whatsapp/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(waForm) });
    setWaForm(f => ({ ...f, whatsapp_access_token: '' }));
    load();
    alert('تم حفظ بيانات واتساب ✅');
  }

  async function addPermission(e) {
    e.preventDefault();
    if (!permForm.key || !permForm.label) return;
    const res = await fetch('/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(permForm) });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    setPermForm({ key: '', label: '', group: 'عام' });
    load();
  }

  async function removePermission(id) {
    if (!confirm('حذف هذه الصلاحية؟ (لن تنعكس على المستخدمين الحاليين تلقائياً)')) return;
    await fetch(`/api/permissions/${id}`, { method: 'DELETE' });
    load();
  }

  async function saveSetting(e) {
    e.preventDefault();
    if (!settingForm.key) return;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingForm) });
    setSettingForm({ key: '', value: '' });
    load();
  }

  const grouped = permissions.reduce((acc, p) => { acc[p.grp] = acc[p.grp] || []; acc[p.grp].push(p); return acc; }, {});

  return (
    <Layout user={user} title="إعدادات النظام">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>📲 ربط واتساب بزنس (API الرسمي من Meta)</h3>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          أول 1000 رسالة بالشهر مجانية، وبعدها رسوم بسيطة لكل رسالة. تحتاج حساب Meta for Developers + رقم واتساب بزنس موثّق.
          {waConfig && (
            <strong style={{ display: 'block', marginTop: 8, color: waConfig.connected ? '#059669' : '#DC2626' }}>
              {waConfig.connected ? '✅ متصل حالياً' : '⚠️ غير متصل بعد'}
            </strong>
          )}
        </p>
        <form onSubmit={saveWhatsappConfig}>
          <div className="grid grid-3">
            <div className="form-row">
              <label>Phone Number ID</label>
              <input value={waForm.whatsapp_phone_number_id} onChange={e => setWaForm({ ...waForm, whatsapp_phone_number_id: e.target.value })} placeholder="مثال: 109876543210123" />
            </div>
            <div className="form-row">
              <label>Access Token {waConfig?.config?.whatsapp_access_token && <span style={{ color: '#9CA3AF' }}>(محفوظ: {waConfig.config.whatsapp_access_token})</span>}</label>
              <input type="password" value={waForm.whatsapp_access_token} onChange={e => setWaForm({ ...waForm, whatsapp_access_token: e.target.value })} placeholder="اترك فارغ إذا ما تبي تغييره" />
            </div>
            <div className="form-row">
              <label>اسم القالب المعتمد (اختياري)</label>
              <input value={waForm.whatsapp_template_name} onChange={e => setWaForm({ ...waForm, whatsapp_template_name: e.target.value })} placeholder="مثال: employee_announcement" />
            </div>
          </div>
          <button className="btn">حفظ بيانات واتساب</button>
        </form>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
          ملاحظة: الرسائل النصية الحرة تشتغل بس إذا الموظف راسلكم أول (خلال آخر 24 ساعة). لإرسال تبليغات مباشرة بدون رد سابق، لازم تنشئ Template رسالة وتوافق عليه Meta أولاً من لوحة تحكم واتساب بزنس.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>➕ إضافة صلاحية جديدة</h3>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          أي صلاحية تضيفها هنا تظهر تلقائياً بصفحة "المستخدمون" وتقدر تفعّلها لأي موظف — بدون أي حاجة لتعديل بالكود مستقبلاً.
          بعد ما تضيفها كصلاحية هنا، اربطها بأي جزء جديد بالنظام لاحقاً حسب الحاجة.
        </p>
        <form onSubmit={addPermission}>
          <div className="grid grid-3">
            <div className="form-row"><label>مفتاح الصلاحية (إنجليزي، بدون مسافات)</label><input placeholder="مثال: view_camera_room" value={permForm.key} onChange={e => setPermForm({ ...permForm, key: e.target.value })} /></div>
            <div className="form-row"><label>الاسم الظاهر بالعربي</label><input placeholder="مثال: مشاهدة غرفة الكاميرات" value={permForm.label} onChange={e => setPermForm({ ...permForm, label: e.target.value })} /></div>
            <div className="form-row"><label>الفئة/التصنيف</label><input value={permForm.group} onChange={e => setPermForm({ ...permForm, group: e.target.value })} /></div>
          </div>
          <button className="btn">إضافة الصلاحية</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>الصلاحيات الحالية بالنظام</h3>
        {Object.entries(grouped).map(([group, perms]) => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#378ADD', marginBottom: 6 }}>{group}</div>
            <table>
              <thead><tr><th>الاسم</th><th>المفتاح</th><th></th></tr></thead>
              <tbody>
                {perms.map(p => (
                  <tr key={p.id}>
                    <td>{p.label}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>{p.key}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => removePermission(p.id)}>حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>⚙️ إعدادات عامة (قابلة للتوسع مستقبلاً)</h3>
        <p style={{ color: '#6B7280', fontSize: 13 }}>مكان مرن لأي إعداد جديد تحتاجه بالمستقبل (روابط، مفاتيح خدمات، قيم تحكم...) بدون تعديل الكود.</p>
        <form onSubmit={saveSetting}>
          <div className="grid grid-3">
            <div className="form-row"><label>المفتاح</label><input value={settingForm.key} onChange={e => setSettingForm({ ...settingForm, key: e.target.value })} /></div>
            <div className="form-row"><label>القيمة</label><input value={settingForm.value} onChange={e => setSettingForm({ ...settingForm, value: e.target.value })} /></div>
          </div>
          <button className="btn">حفظ الإعداد</button>
        </form>
        <table style={{ marginTop: 14 }}>
          <thead><tr><th>المفتاح</th><th>القيمة</th></tr></thead>
          <tbody>
            {Object.entries(settings).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
