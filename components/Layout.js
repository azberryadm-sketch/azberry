import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  TbLayoutDashboard, TbClipboardPlus, TbClipboardList, TbBuildingStore, TbUsers,
  TbCategory, TbAlertTriangle, TbArchive, TbSpeakerphone, TbVideo, TbChartBar,
  TbMessageCircle, TbChecklist, TbMessage2, TbUserCog, TbBell, TbSettings,
  TbLogout, TbMenu2, TbSun, TbMoon, TbPlus, TbUser, TbStar, TbReportAnalytics,
} from 'react-icons/tb';

const links = [
  { href: '/', label: 'الداشبورد', Icon: TbLayoutDashboard, perm: 'view_dashboard' },  { href: '/evaluations/new', label: 'تقييم جديد', Icon: TbClipboardPlus, perm: 'view_evaluations' },
  { href: '/evaluations', label: 'سجل التقييمات', Icon: TbClipboardList, perm: 'view_evaluations' },
  { href: '/branches', label: 'الأفرع', Icon: TbBuildingStore, perm: 'manage_branches' },
  { href: '/users', label: 'المستخدمون', Icon: TbUsers, perm: 'manage_users' },
  { href: '/sections', label: 'أقسام التقييم', Icon: TbCategory, perm: 'manage_sections' },
  { href: '/problems', label: 'المشاكل', Icon: TbAlertTriangle, perm: 'view_problems' },
  { href: '/archive', label: 'الأرشيف', Icon: TbArchive, perm: 'view_archive' },
  { href: '/marketing', label: 'داشبورد الماركتنك', Icon: TbSpeakerphone, perm: 'view_marketing_dashboard' },
  { href: '/camera-room', label: 'رفع بلاغ كاميرا', Icon: TbVideo, perm: 'manage_camera_notes' },
  { href: '/camera-logs', label: 'سجل بلاغات الكاميرات', Icon: TbChartBar, perm: 'view_camera_logs' },
  { href: '/camera-dashboard', label: 'داشبورد الكاميرات', Icon: TbChartBar, perm: 'manage_camera_notes' },
  { href: '/social-complaints', label: 'شكاوى الزبائن', Icon: TbMessageCircle, perm: 'manage_social_complaints' },
  { href: '/tasks', label: 'المهام والتاسكات', Icon: TbChecklist, perm: 'view_tasks' },
  { href: '/announcements', label: 'التبليغات', Icon: TbMessage2, perm: null },
  { href: '/hr', label: 'الموارد البشرية', Icon: TbUserCog, perm: 'manage_hr' },
  { href: '/performance-sessions', label: 'دورات تقييم الأداء', Icon: TbStar, perm: 'manage_performance_sessions' },
  { href: '/performance-eval', label: 'تقييم أداء موظف', Icon: TbClipboardPlus, perm: 'submit_performance_eval' },
  { href: '/performance-results', label: 'نتائج تقييم الأداء', Icon: TbReportAnalytics, perm: 'view_performance_results' },
  { href: '/notifications', label: 'الإشعارات', Icon: TbBell, perm: 'view_notifications' },
  { href: '/settings', label: 'إعدادات النظام', Icon: TbSettings, perm: 'manage_settings' },
];

export default function Layout({ user, title, children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const isDark = saved === 'dark';
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    // Liquid Glass — يتبع المؤشر
    const glow = document.getElementById('liquidGlow');
    function onMouseMove(e) {
      const x = (e.clientX / window.innerWidth * 100).toFixed(1) + '%';
      const y = (e.clientY / window.innerHeight * 100).toFixed(1) + '%';
      if (glow) glow.style.setProperty('--gx', x) || glow.style.setProperty('--gy', y);
      document.querySelectorAll('.card, .topbar').forEach(el => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--lx', (e.clientX - rect.left) + 'px');
        el.style.setProperty('--ly', (e.clientY - rect.top) + 'px');
      });
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    window.localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  useEffect(() => {
    function loadCount() {
      fetch('/api/notifications').then(r => r.json()).then(d => setUnread(d.unreadCount || 0)).catch(() => {});
    }
    loadCount();
    const t = setInterval(loadCount, 20000); // تحديث كل 20 ثانية
    return () => clearInterval(t);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="app-shell">
      {/* Liquid Glass Glow */}
      <div id="liquidGlow" aria-hidden="true" />
      {/* تموجات زخرفية */}
      <div id="appDecor" aria-hidden="true">
        <div className="decorWave w1" />
        <div className="decorWave w2" />
      </div>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand" style={{ padding: '22px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 216, height: 204, bottom: -48, left: -48, background: '#fff', opacity: .12, borderRadius: '40% 60% 55% 45% / 50% 45% 55% 50%', zIndex: 0 }} />
          <div className="brand-badge" style={{ position: 'relative', zIndex: 1 }}><img src="/logo.png" alt="ازبيري" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} /></div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.50)', marginTop: 4, position: 'relative', zIndex: 1 }}>AzBerry AOP · نظام تقييم الأفرع</div>
        </div>
        <nav>
          {links.filter(l => (l.perm === null || (user?.permissions || []).includes(l.perm))).map(l => (
            <Link key={l.href} href={l.href} className={router.pathname === l.href ? 'active' : ''} onClick={() => setOpen(false)}>
              <l.Icon size={19} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{l.label}</span>
              {l.href === '/notifications' && unread > 0 && (
                <span style={{ background: '#EF4444', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '1px 7px' }}>{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>
          <TbLogout size={19} />
          <span>تسجيل خروج</span>
        </button>
      </aside>
      <main className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger" onClick={() => setOpen(true)}><TbMenu2 size={20} /></button>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">{user?.full_name} · {user?.role === 'admin' ? 'مدير' : 'موظف'}</span>
            <button className="theme-toggle" onClick={toggleTheme} title={darkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}>
              {darkMode ? <TbSun size={19} /> : <TbMoon size={19} />}
            </button>
            <div className="icon-btn" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push('/notifications')}>
              <TbBell size={19} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -3, left: -3, background: '#EF4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{unread}</span>
              )}
            </div>
            <div className="icon-btn" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => router.push('/profile')}>
              {user?.photo_path ? (
                <img src={user.photo_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : <TbUser size={19} />}
            </div>
          </div>
        </div>
        {children}
      </main>
      <nav className={`bottom-dock${dockHidden ? ' dock-hidden' : ''}`}>
        {(() => {
          const visible = links.filter(l => (l.perm === null || (user?.permissions || []).includes(l.perm)));
          const before = visible.slice(0, 2);
          const after = visible.slice(2, 4);
          return (
            <>
              {before.map(l => (
                <Link key={l.href} href={l.href} className={router.pathname === l.href ? 'active' : ''}><l.Icon size={19} /></Link>
              ))}
              <Link href="/evaluations/new" className="dock-center"><TbPlus size={20} /></Link>
              {after.map(l => (
                <Link key={l.href} href={l.href} className={router.pathname === l.href ? 'active' : ''}><l.Icon size={19} /></Link>
              ))}
            </>
          );
        })()}
      </nav>
    </div>
  );
}
