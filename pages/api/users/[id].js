const bcrypt = require('bcryptjs');
const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { username, full_name, phone, employee_id, email, role, active, password, branch_ids, permissions } = req.body || {};

    if (username) {
      const exists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), id);
      if (exists) return res.status(400).json({ error: 'اسم المستخدم مستخدم من قبل موظف آخر' });
      db.prepare('UPDATE users SET username=? WHERE id=?').run(username.trim(), id);
    }

    db.prepare(`UPDATE users SET full_name=?, phone=?, employee_id=?, email=?, role=?, active=?, permissions=? WHERE id=?`)
      .run(full_name, phone || null, employee_id || null, email || null, role === 'admin' ? 'admin' : 'inspector', active ? 1 : 0, JSON.stringify(permissions || []), id);

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, id);
    }

    if (Array.isArray(branch_ids)) {
      db.prepare('DELETE FROM user_branches WHERE user_id=?').run(id);
      const ins = db.prepare('INSERT INTO user_branches (user_id, branch_id) VALUES (?,?)');
      branch_ids.forEach(bid => ins.run(id, bid));
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    db.prepare('DELETE FROM users WHERE id=?').run(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_users');
