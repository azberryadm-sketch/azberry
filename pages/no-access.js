import { getUserFromReq } from '../lib/auth';

export async function getServerSideProps(context) {
  const user = getUserFromReq(context.req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

export default function NoAccess() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, fontFamily: 'Tajawal, sans-serif' }}>
      <div style={{ fontSize: 60 }}>🔒</div>
      <h2>ما عندك صلاحية الوصول لهذه الصفحة</h2>
      <p style={{ color: '#6B7280' }}>تواصل مع مدير النظام إذا تحتاج صلاحية إضافية.</p>
      <a href="/" className="btn" style={{ background: '#378ADD', color: '#fff', padding: '10px 24px', borderRadius: 10, textDecoration: 'none' }}>الرجوع للرئيسية</a>
    </div>
  );
}
