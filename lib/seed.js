// lib/seed.js
// يشغّل مرة واحدة (npm run seed) لإنشاء أول مستخدم أدمن وأقسام التقييم الافتراضية
const bcrypt = require('bcryptjs');
const db = require('./db');

function upsertSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value);
}

// 1) إعدادات هوية الشركة الافتراضية (نفس ألوان الشعار المرسل)
upsertSetting('company_name', 'ازبيري');
upsertSetting('primary_color', '#ED6B23'); // برتقالي غامق من الشعار
upsertSetting('secondary_color', '#F7941D'); // برتقالي فاتح
upsertSetting('logo_url', '/logo.png');

// 2) مستخدم أدمن افتراضي
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin@123', 10);
  db.prepare(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)`)
    .run('admin', hash, 'مدير النظام', 'admin');
  console.log('تم إنشاء مستخدم أدمن: admin / Admin@123  (غيّر كلمة المرور فوراً بعد أول دخول)');
}

// 3) الأقسام الافتراضية المطلوبة
const defaultSections = [
  ['الواجهة (الرصيف والزجاج الخارجي)', 'نظافة وسلامة واجهة الفرع الخارجية'],
  ['المكائن ونظافتها', 'تقييم حالة ونظافة المكائن'],
  ['ملحقات المكائن', 'ملحقات وأدوات المكائن'],
  ['نظافة الصالة وملحقاتها', 'نظافة صالة الفرع وكل ملحقاتها'],
  ['المطبخ ومحتوياته', 'نظافة وترتيب المطبخ'],
  ['أدوات التحضير', 'حالة ونظافة أدوات التحضير'],
  ['غرفة تبريد الفواكه', 'حالة غرفة تبريد الفواكه ونظافتها'],
  ['غرفة تجميد الفواكه', 'حالة غرفة تجميد الفواكه ونظافتها'],
  ['مخزن المواد الأولية', 'ترتيب ونظافة وسلامة مخزون المواد الأولية'],
];

const countSections = db.prepare('SELECT COUNT(*) c FROM sections').get().c;
if (countSections === 0) {
  const insert = db.prepare(`INSERT INTO sections (name, description, sort_order, min_score) VALUES (?,?,?,?)`);
  defaultSections.forEach((s, i) => insert.run(s[0], s[1], i + 1, 3));
  console.log('تم إنشاء أقسام التقييم الافتراضية (' + defaultSections.length + ' قسم).');
}

console.log('اكتمل تجهيز قاعدة البيانات بنجاح.');
