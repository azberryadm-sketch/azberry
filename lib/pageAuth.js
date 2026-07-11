// lib/pageAuth.js
const { getUserFromReq } = require('./auth');
const db = require('./db');
const { hasPermission, getEffectivePermissions } = require('./permissions');

// استخدمها داخل getServerSideProps لأي صفحة محمية
// requiredPermission: null = أي مستخدم مسجل دخول، أو مفتاح صلاحية مثل 'manage_users'
function requirePageAuth(context, requiredPermission = null) {
  const tokenUser = getUserFromReq(context.req);
  if (!tokenUser) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // نجيب أحدث بيانات المستخدم من قاعدة البيانات (مو من التوكن) عشان أي تغيير بالصلاحيات ينعكس فوراً بدون تسجيل خروج
  const freshUser = db.prepare('SELECT id, username, full_name, role, permissions, active, photo_path FROM users WHERE id = ?').get(tokenUser.id);
  if (!freshUser || !freshUser.active) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  if (requiredPermission && !hasPermission(freshUser, requiredPermission)) {
    return { redirect: { destination: '/no-access', permanent: false } };
  }

  return {
    props: {
      user: {
        id: freshUser.id,
        username: freshUser.username,
        full_name: freshUser.full_name,
        role: freshUser.role,
        photo_path: freshUser.photo_path || null,
        permissions: getEffectivePermissions(freshUser),
      },
    },
  };
}

module.exports = { requirePageAuth };
