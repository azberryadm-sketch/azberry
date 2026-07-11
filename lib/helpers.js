// lib/helpers.js
const db = require('./db');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => (obj[r.key] = r.value));
  return obj;
}

// يحدد لون التنبيه حسب النسبة المئوية للتقييم
function scoreColor(percent) {
  if (percent >= 85) return { color: '#16a34a', label: 'ممتاز' };      // أخضر
  if (percent >= 70) return { color: '#eab308', label: 'جيد' };         // أصفر
  if (percent >= 50) return { color: '#f97316', label: 'يحتاج متابعة' }; // برتقالي
  return { color: '#dc2626', label: 'ضعيف - يتطلب تدخل' };              // أحمر
}

module.exports = { getSettings, scoreColor };
