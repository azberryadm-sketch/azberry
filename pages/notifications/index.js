import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { requirePageAuth } from '../../lib/pageAuth';
import { TbAlertTriangle, TbAlertCircle, TbInfoCircle, TbBellRinging } from 'react-icons/tb';

export async function getServerSideProps(context) {
  return requirePageAuth(context, 'view_notifications');
}

const levelConfig = {
  danger: { color: '#E11D48', bg: 'rgba(225,29,72,0.1)', Icon: TbAlertCircle, label: 'هام' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', Icon: TbAlertTriangle, label: 'تنبيه' },
  info: { color: '#0369A1', bg: 'rgba(3,105,161,0.1)', Icon: TbInfoCircle, label: 'معلومة' },
};

export default function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);

  function load() {
    fetch('/api/notifications').then(r => r.json()).then(d => setNotifications(d.notifications || []));
  }
  useEffect(load, []);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PUT' });
    load();
  }

  return (
    <Layout user={user} title="الإشعارات">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-sm btn-outline" onClick={markAllRead}>تحديد الكل كمقروء</button>
        </div>
        {notifications.map(n => {
          const cfg = levelConfig[n.level] || levelConfig.info;
          return (
            <div key={n.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(3,105,161,0.08)', opacity: n.is_read ? 0.55 : 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <cfg.Icon size={18} color={cfg.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="badge" style={{ background: cfg.color }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 14 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{n.created_at}</div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            <TbBellRinging size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>لا توجد إشعارات</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
