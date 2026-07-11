const bcrypt = require('bcryptjs');
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const users = db.prepare(`SELECT id, username, full_name, phone, employee_id, email, role, active, permissions, created_at FROM users ORDER BY id DESC`).all();
    const branchStmt = db.prepare(`SELECT b.id, b.name FROM user_branches ub JOIN branches b ON b.id = ub.branch_id WHERE ub.user_id = ?`);
    const withBranches = users.map(u => ({ ...u, branches: branchStmt.all(u.id) }));
    return res.status(200).json({ users: withBranches });
  }

  if (req.method === 'POST') {
    const { username, password, full_name, phone, employee_id, email, role, branch_ids } = req.body || {};
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'الرجاء تعبئة اسم المستخدم وكلمة المرور والاسم الكامل' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (exists) return res.status(400).json({ error: 'اسم المستخدم مستخدم مسبقاً' });

    const hash = bcrypt.hashSync(password, 10);
    const defaultPerms = JSON.stringify(['view_dashboard', 'view_evaluations', 'view_problems', 'view_notifications']);
    const info = db.prepare(`INSERT INTO users (username, password_hash, full_name, phone, employee_id, email, role, permissions) VALUES (?,?,?,?,?,?,?,?)`)
      .run(username.trim(), hash, full_name, phone || null, employee_id || null, email || null, role === 'admin' ? 'admin' : 'inspector', defaultPerms);

    if (Array.isArray(branch_ids)) {
      const ins = db.prepare('INSERT INTO user_branches (user_id, branch_id) VALUES (?,?)');
      branch_ids.forEach(bid => ins.run(info.lastInsertRowid, bid));
    }
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_users');
