// lib/db.js
// طبقة الاتصال بقاعدة البيانات SQLite + إنشاء الجداول تلقائياً عند أول استخدام فعلي
// نستخدم وحدة node:sqlite المدمجة داخل Node.js (لا تحتاج تصريف/Python/Build Tools)
//
// مهم: التهيئة "كسولة" (Lazy) عن قصد — لا نفتح قاعدة البيانات ولا ننفذ أي SQL
// إلا عند أول استعلام فعلي وقت التشغيل الحقيقي (Runtime)، وليس وقت البناء (Build).
// هذا يمنع أي تعارض مع نسخة سابقة شغالة على نفس الملف أثناء عملية "next build".

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

let _db = null;

function initDb() {
  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const DB_PATH = path.join(DATA_DIR, 'app.db');
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'inspector', -- admin | inspector
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  city TEXT,
  address TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- الأقسام/بنود التقييم القابلة للتعديل والإضافة من داخل النظام
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  min_score REAL DEFAULT 3, -- الحد الأدنى المقبول (من 5) قبل التنبيه الأحمر
  active INTEGER NOT NULL DEFAULT 1
);

-- ربط الموظفين بالأفرع المسموح لهم بزيارتها (فارغ = كل الأفرع)
CREATE TABLE IF NOT EXISTS user_branches (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);

-- زيارة/تقييم فرع
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  inspector_id INTEGER NOT NULL REFERENCES users(id),
  visit_date TEXT NOT NULL,
  overall_score REAL,      -- النسبة المئوية الإجمالية 0-100
  general_notes TEXT,
  status TEXT DEFAULT 'submitted', -- draft | submitted
  created_at TEXT DEFAULT (datetime('now'))
);

-- درجة كل قسم داخل كل تقييم
CREATE TABLE IF NOT EXISTS evaluation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  score REAL NOT NULL, -- من 1 إلى 5
  note TEXT
);

-- المشاكل المرصودة (من مشرف الفرع / إدارة الفرع / ملاحظات على الموظفين والشيفات)
CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  evaluation_id INTEGER REFERENCES evaluations(id),
  source TEXT NOT NULL, -- مشرف الفرع | إدارة الفرع | موظفين وشيفات
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- التنبيهات (تنشأ تلقائياً عند نزول أي قسم عن الحد الأدنى)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER REFERENCES branches(id),
  evaluation_id INTEGER REFERENCES evaluations(id),
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'warning', -- warning | danger | info
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- كتالوج الصلاحيات — قابل للإضافة من واجهة النظام مباشرة بدون كود
CREATE TABLE IF NOT EXISTS permission_defs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  "group" TEXT DEFAULT 'عام',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ملاحظات/تقارير غرفة متابعة الكاميرات (مرتبطة تلقائياً بتقارير الفرع)
CREATE TABLE IF NOT EXISTS camera_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  title TEXT,
  description TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- شكاوى السوشل ميديا (مرتبطة تلقائياً بتقارير الفرع)
CREATE TABLE IF NOT EXISTS social_complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  platform TEXT,
  complaint_text TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- إعدادات عامة قابلة للتعديل من التطبيق (شعار، ألوان، اسم الشركة، وأي إعداد مستقبلي)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- المهام/التاسكات والتكتات
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  branch_id INTEGER REFERENCES branches(id),
  assigned_to INTEGER REFERENCES users(id),
  priority TEXT DEFAULT 'متوسطة', -- عالية | متوسطة | منخفضة
  status TEXT DEFAULT 'جديدة', -- جديدة | قيد التنفيذ | مكتملة
  due_date TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- تبليغات/رسائل من الإدارة للموظفين (قابلة للقراءة فقط) + إرسال واتساب
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id INTEGER REFERENCES users(id), -- فارغ = للجميع
  sent_whatsapp INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- قراءة التبليغات لكل موظف
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (announcement_id, user_id)
);

-- سجلات الموارد البشرية (إجازات، ملاحظات، مستندات مختصرة لكل موظف)
CREATE TABLE IF NOT EXISTS hr_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- إجازة | إنذار | تقييم أداء | ملاحظة عامة
  title TEXT,
  details TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'قائم', -- قائم | مغلق
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- القوائم المنسدلة المخصصة القابلة للتحكم من الإعدادات (مصدر المشكلة، منصة السوشل ميديا، أولوية التاسك...)
CREATE TABLE IF NOT EXISTS dropdown_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_key TEXT NOT NULL, -- مثال: problem_sources, social_platforms, task_priorities
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
`);

  // ترحيل آمن: إضافة أعمدة جديدة لقواعد بيانات منشأة مسبقاً بدون كسرها
  function safeAddColumn(table, columnDef) {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`); } catch (e) { /* العمود موجود مسبقاً */ }
  }
  safeAddColumn('users', 'employee_id TEXT');
  safeAddColumn('users', 'email TEXT');
  safeAddColumn('evaluation_items', 'photo_path TEXT');
  safeAddColumn('users', 'permissions TEXT'); // JSON array من مفاتيح الصلاحيات
  safeAddColumn('evaluations', 'archived INTEGER DEFAULT 0');
  safeAddColumn('evaluations', 'archived_at TEXT');
  safeAddColumn('evaluation_items', 'media_paths TEXT'); // JSON array من مسارات الصور/الفيديوهات المتعددة
  safeAddColumn('sections', "category TEXT DEFAULT 'عام'"); // تصنيف القسم: عام / ماركتنك
  safeAddColumn('camera_notes', "category TEXT DEFAULT 'أخرى'");
  safeAddColumn('camera_notes', "status TEXT DEFAULT 'مفتوحة'");
  safeAddColumn('camera_notes', 'job_title TEXT');
  safeAddColumn('camera_notes', 'employee_name TEXT');
  safeAddColumn('camera_notes', 'camera_time TEXT');
  safeAddColumn('camera_notes', 'report_date TEXT');
  safeAddColumn('camera_notes', 'camera_location TEXT');
  safeAddColumn('camera_notes', 'violation TEXT');
  safeAddColumn('camera_notes', 'media_paths TEXT');
safeAddColumn('social_complaints', 'complaint_date TEXT');
safeAddColumn('social_complaints', 'problem_type TEXT');
safeAddColumn('social_complaints', 'compensation TEXT');
safeAddColumn('social_complaints', 'notified INTEGER DEFAULT 0');
safeAddColumn('users', 'photo_path TEXT');

  // جداول نظام تقييم الأداء الوظيفي
  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT DEFAULT 'upcoming',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS performance_criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      max_score INTEGER NOT NULL DEFAULT 10,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS performance_evals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES performance_sessions(id),
      employee_name TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      supervisor_name TEXT,
      job_title TEXT,
      eval_date TEXT DEFAULT (date('now')),
      general_notes TEXT,
      total_score INTEGER DEFAULT 0,
      submitted_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS performance_eval_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_id INTEGER NOT NULL REFERENCES performance_evals(id) ON DELETE CASCADE,
      criterion_id INTEGER NOT NULL REFERENCES performance_criteria(id),
      score INTEGER DEFAULT 0,
      reason TEXT
    );
  `);

  // إضافة المعايير الـ 14 الافتراضية لو ما موجودة
  const critCount = db.prepare('SELECT COUNT(*) as c FROM performance_criteria').get().c;
  if (critCount === 0) {
    const defaultCriteria = [
      ['مواعيد وساعات العمل', 4],
      ['النظافة الشخصية والزي الموحد', 10],
      ['ارتداء التجهيزات', 8],
      ['نظافة مكان العمل', 10],
      ['الالتزام بأداء المهام الوظيفية', 8],
      ['الالتزام بمكان العمل المخصص', 10],
      ['المبادرة والسرعة البديهية', 6],
      ['الإنتاجية في العمل', 6],
      ['جودة الإنتاج', 6],
      ['الحرص والتبليغ', 4],
      ['الالتزام بالتعليمات', 6],
      ['التعامل مع الزملاء', 6],
      ['التعامل مع العملاء', 10],
      ['التجاوب مع ضغط العمل', 6],
    ];
    const insertCrit = db.prepare('INSERT INTO performance_criteria (name, max_score, sort_order) VALUES (?, ?, ?)');
    defaultCriteria.forEach(([name, max], i) => insertCrit.run(name, max, i + 1));
  }

  // أرشفة تلقائية: أي تقييم عمره أكثر من 30 يوم يُنقل للأرشيف تلقائياً
  try {
    db.exec(`UPDATE evaluations SET archived = 1, archived_at = datetime('now')
             WHERE archived = 0 AND visit_date < date('now', '-30 days')`);
  } catch (e) { /* تجاهل أي خطأ ترحيل غير حرج */ }

  // تعبئة كتالوج الصلاحيات الافتراضي مرة واحدة فقط (بعدها كله يُدار من واجهة الإعدادات بدون كود)
  try {
    const defaultPermissions = [
      ['view_dashboard', 'مشاهدة لوحة التحكم', 'عام'],
      ['view_evaluations', 'مشاهدة/إضافة تقييمات وزيارات', 'التقييمات'],
      ['delete_evaluations', 'حذف تقارير/تقييمات (للأخطاء)', 'التقييمات'],
      ['manage_branches', 'إدارة الأفرع (إضافة/تعديل/حذف)', 'الإدارة'],
      ['manage_users', 'إدارة المستخدمين والصلاحيات', 'الإدارة'],
      ['manage_sections', 'إدارة أقسام التقييم (إضافة/تعديل الاسم)', 'الإدارة'],
      ['manage_settings', 'إدارة إعدادات النظام والصلاحيات', 'الإدارة'],
      ['view_problems', 'مشاهدة المشاكل', 'المشاكل'],
      ['manage_problems', 'تغيير حالة المشاكل (حل/إعادة فتح)', 'المشاكل'],
      ['view_notifications', 'مشاهدة الإشعارات', 'عام'],
      ['view_archive', 'مشاهدة الأرشيف', 'الأرشيف'],
      ['manage_archive', 'حذف/استعادة من الأرشيف (موافقة)', 'الأرشيف'],
      ['view_marketing_dashboard', 'داشبورد فريق الماركتنك', 'الماركتنك'],
      ['manage_camera_notes', 'رفع بلاغات غرفة الكاميرات', 'الكاميرات'],
      ['view_camera_logs', 'مشاهدة سجل بلاغات الكاميرات', 'الكاميرات'],
      ['manage_social_complaints', 'إدارة شكاوى السوشل ميديا', 'السوشل ميديا'],
      ['manage_tasks', 'إدارة المهام والتاسكات', 'المهام'],
      ['view_tasks', 'مشاهدة المهام المسندة لي', 'المهام'],
      ['manage_announcements', 'إرسال تبليغات للموظفين', 'التبليغات'],
      ['manage_hr', 'إدارة سجلات الموارد البشرية', 'الموارد البشرية'],
      ['manage_performance_sessions', 'فتح وإغلاق دورات تقييم الأداء', 'تقييم الأداء'],
      ['submit_performance_eval', 'رفع تقييم أداء موظف', 'تقييم الأداء'],
      ['view_performance_results', 'مشاهدة نتائج تقييمات الأداء', 'تقييم الأداء'],
      ['manage_performance_sessions', 'فتح وإغلاق دورات تقييم الأداء', 'تقييم الأداء'],
      ['submit_performance_eval', 'رفع تقييم أداء موظف (مشرف الفرع)', 'تقييم الأداء'],
      ['view_performance_results', 'مشاهدة نتائج تقييمات الأداء', 'تقييم الأداء'],
      ['manage_dropdowns', 'إدارة القوائم المنسدلة بالنظام', 'الإدارة'],
    ];
    const permCount = db.prepare('SELECT COUNT(*) c FROM permission_defs').get().c;
    if (permCount === 0) {
      const insertPerm = db.prepare('INSERT INTO permission_defs (key, label, "group") VALUES (?,?,?)');
      defaultPermissions.forEach(p => insertPerm.run(...p));
    }
  } catch (e) { /* تجاهل */ }

  // تعبئة القوائم المنسدلة الافتراضية - كل قائمة تُضاف مرة وحدة فقط بغض النظر عن القوائم الثانية
  try {
    const insertOpt = db.prepare('INSERT INTO dropdown_options (list_key, value, sort_order) VALUES (?,?,?)');
    const defaults = {
      problem_sources: ['مشرف الفرع', 'إدارة الفرع', 'ملاحظات على الموظفين والشيفات'],
      social_platforms: ['انستقرام', 'تيك توك', 'سناب شات', 'فيسبوك', 'قوقل ريفيوز', 'أخرى'],
      task_priorities: ['عالية', 'متوسطة', 'منخفضة'],
      camera_categories: ['شاشات', 'ساين المكائن', 'المنيو', 'الشعارات', 'أخرى'],
      hr_types: ['إجازة', 'إنذار', 'تقييم أداء', 'ملاحظة عامة'],
      job_titles: ['كاشير', 'شيف', 'مشرف فرع', 'عامل تحضير', 'عامل نظافة', 'أخرى'],
      camera_locations: ['الكاشير', 'مطبخ الشيف', 'المكائن الخارجية', 'المكائن الداخلية', 'الصالة', 'مطبخ التجهيز', 'مخزن', 'أخرى'],
      violation_types: [
        'عدم التذوق', 'العمل بدون ارتداء التجهيزات', 'عدم ارتداء الزي الرسمي', 'النوم اثناء العمل',
        'عدم الالتزام بالوصفات', 'التجهيز بصورة غير صحيحة', 'المزاح خارج نطاق العمل', 'استخدام الهاتف لفترة طويلة',
        'الجلوس فوق طاولة العمل', 'تجمع الموظفين', 'غسل المكائن بصورة غير صحيحة', 'استخدام البلانك بدل الخلاط صباحاً',
        'عدم امتلاء المكائن عند الذروه', 'عدم الالتزام بالنظافة', 'أخرى',
      ],
      complaint_problem_types: [
        'مشكلة بالطعم', 'عدم وجود قصبات', 'الطلب غير بارد', 'تلف الطلب', 'بدون كتابة نوع الأزبيري',
        'تأخير بالطلب', 'مخالف للطلب بالطعم والحجم او نقص', 'مشكلة الفرع بالتقديم والنظافة', 'أخرى',
      ],
      complaint_sources: ['طلبات التوصيل', 'صفحات التواصل الإجتماعي', 'اتصال هاتفي', 'زيارة شخصية', 'أخرى'],
    };
    Object.entries(defaults).forEach(([key, values]) => {
      const existing = db.prepare('SELECT COUNT(*) c FROM dropdown_options WHERE list_key=?').get(key).c;
      if (existing === 0) {
        values.forEach((v, i) => insertOpt.run(key, v, i));
      }
    });
  } catch (e) { /* تجاهل */ }

  // أي موظف موجود مسبقاً بدون صلاحيات محفوظة يُعطى صلاحيات أساسية تلقائياً حتى لا يفقد الوصول فجأة
  try {
    const basicPerms = JSON.stringify(['view_dashboard', 'view_evaluations', 'view_problems', 'view_notifications']);
    db.prepare(`UPDATE users SET permissions = ? WHERE (permissions IS NULL OR permissions = '') AND role != 'admin'`).run(basicPerms);
  } catch (e) { /* تجاهل */ }

  return db;
}

function getDb() {
  if (!_db) _db = initDb();
  return _db;
}

// نصدّر Proxy بنفس واجهة DatabaseSync (prepare/exec/...) لكن التهيئة الفعلية
// تحصل فقط عند أول استخدام حقيقي، وليس عند مجرد استيراد الملف (require)
module.exports = new Proxy({}, {
  get(target, prop) {
    const real = getDb();
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
