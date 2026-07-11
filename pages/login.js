import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const glow = document.getElementById('loginGlow');
    function onMove(e) {
      if (glow) {
        glow.style.background = `radial-gradient(650px circle at ${e.clientX}px ${e.clientY}px, rgba(255,255,255,0.28), transparent 55%)`;
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  async function doLogin(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/');
      } else {
        setError(data.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, var(--primary, #F47920) 0%, var(--primary-dark, #EC4D24) 100%)`, position: 'relative', overflow: 'hidden' }}>
      {/* Liquid Glass Glow */}
      <div id="loginGlow" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
      {/* تموجات زخرفية */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 456, height: 432, top: -96, left: -72, background: '#fff', opacity: .20, borderRadius: '40% 60% 55% 45% / 50% 45% 55% 50%' }} />
        <div style={{ position: 'absolute', width: 380, height: 380, bottom: -84, right: -60, background: 'rgba(255,255,255,0.12)', borderRadius: '55% 45% 40% 60% / 45% 55% 50% 50%' }} />
      </div>

      <form onSubmit={doLogin} style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.72)', width: 360, maxWidth: '90vw', padding: '36px 30px', borderRadius: 22, boxShadow: '0 25px 60px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)', textAlign: 'center' }}>
        <div style={{ marginBottom: 20 }}>
          <img src="/logo.png" alt="ازبيري" style={{ height: 60, objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>نظام تقييم الأفرع · AzBerry AOP</div>

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'rgba(255,255,255,0.8)' }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="كلمة المرور"
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'rgba(255,255,255,0.8)' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, background: 'var(--primary, #F47920)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 6px 18px rgba(244,121,32,0.35)' }}>
          {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
        </button>
        <div style={{ marginTop: 16, fontSize: 11.5, color: '#9ca3af' }}>Crystal Frost · Version 1.0</div>
      </form>
    </div>
  );
}
