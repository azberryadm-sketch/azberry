import { useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbCamera, TbUser } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context);
}

export default function Profile({ user }) {
  const [preview, setPreview] = useState(user.photo_path || null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handlePhoto(file) {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // رفع الصورة
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: reader.result, mime: file.type }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.path) throw new Error('فشل رفع الصورة');

        // تحديث الملف الشخصي
        const profileRes = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_path: uploadData.path }),
        });
        if (!profileRes.ok) throw new Error('فشل تحديث الصورة');

        setPreview(uploadData.path);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (e) {
        alert('حدث خطأ: ' + e.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Layout user={user} title="ملفي الشخصي">
      <div className="card" style={{ maxWidth: 440 }}>
        {success && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 10, padding: 10, marginBottom: 14, color: '#059669', fontSize: 13 }}>
            ✅ تم تحديث الصورة بنجاح
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto 16px', overflow: 'hidden', background: '#EAF6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--primary)' }}>
            {preview
              ? <img src={preview} alt="صورتي" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <TbUser size={50} color="var(--primary)" opacity={0.4} />}
          </div>
          <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TbCamera size={15} />
            {uploading ? 'جاري الرفع...' : 'تغيير الصورة'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handlePhoto(e.target.files[0])}
              disabled={uploading}
            />
          </label>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>الصورة تظهر بجانب اسمك في كل صفحات النظام</p>
        </div>
        <div style={{ marginTop: 20, borderTop: '1px solid rgba(3,105,161,0.1)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(3,105,161,0.06)' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>الاسم الكامل</span>
            <strong>{user.full_name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(3,105,161,0.06)' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>اسم المستخدم</span>
            <strong>{user.username}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>الصلاحية</span>
            <strong>{user.role === 'admin' ? 'مدير النظام' : 'موظف'}</strong>
          </div>
        </div>
      </div>
    </Layout>
  );
}
