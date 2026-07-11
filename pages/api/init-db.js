// API مؤقت لتهيئة قاعدة البيانات - يُحذف بعد الاستخدام
const db = require('../../lib/db');

export default function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== 'azberry-init-2026') {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  
  try {
    // التحقق من وجود الأدمن
    const admin = db.prepare('SELECT id, username FROM users WHERE role=?').get('admin');
    if (admin) {
      return res.json({ ok: true, message: 'قاعدة البيانات جاهزة مسبقاً', admin: admin.username });
    }
    
    // إنشاء الأدمن
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('Admin@123', 10);
    const { v4: uuidv4 } = require('uuid');
    db.prepare('INSERT INTO users (username, password, full_name, role, permissions, active) VALUES (?,?,?,?,?,1)')
      .run('admin', hash, 'مدير النظام', 'admin', JSON.stringify([]));
    
    // إضافة الصلاحيات
    const allPerms = db.prepare('SELECT key FROM permission_defs').all().map(p => p.key);
    db.prepare('UPDATE users SET permissions=? WHERE role=?').run(JSON.stringify(allPerms), 'admin');
    
    return res.json({ ok: true, message: 'تم إنشاء الأدمن بنجاح', username: 'admin', password: 'Admin@123' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
