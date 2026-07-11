// lib/permissions.js
// كتالوج الصلاحيات مخزّن بقاعدة البيانات (جدول permission_defs) — قابل للإضافة من الإعدادات مباشرة بدون كود
const db = require('./db');

function getAllPermissions() {
  return db.prepare('SELECT id, key, label, "group" as grp FROM permission_defs ORDER BY "group", id').all();
}

// الأدمن دائماً يملك كل الصلاحيات تلقائياً بغض النظر عمّا هو محفوظ
function getEffectivePermissions(user) {
  if (!user) return [];
  if (user.role === 'admin') return getAllPermissions().map(p => p.key);
  try {
    return JSON.parse(user.permissions || '[]');
  } catch (e) {
    return [];
  }
}

function hasPermission(user, key) {
  return getEffectivePermissions(user).includes(key);
}

module.exports = { getAllPermissions, getEffectivePermissions, hasPermission };
