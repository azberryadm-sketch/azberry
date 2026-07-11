const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');

async function handler(req, res) {
  if (req.method === 'GET') {
    let branches;
    if (hasPermission(req.user, 'manage_branches')) {
      branches = db.prepare('SELECT * FROM branches ORDER BY name').all();
    } else {
      // الموظف يرى فقط الأفرع المخصصة له (أو الكل إذا ما فيه تخصيص)
      const assigned = db.prepare('SELECT branch_id FROM user_branches WHERE user_id=?').all(req.user.id);
      if (assigned.length === 0) {
        branches = db.prepare('SELECT * FROM branches WHERE active=1 ORDER BY name').all();
      } else {
        const ids = assigned.map(a => a.branch_id);
        branches = db.prepare(`SELECT * FROM branches WHERE id IN (${ids.map(()=>'?').join(',')}) AND active=1 ORDER BY name`).all(...ids);
      }
    }
    return res.status(200).json({ branches });
  }

  if (req.method === 'POST') {
    if (!hasPermission(req.user, 'manage_branches')) return res.status(403).json({ error: 'لا تملك صلاحية إدارة الأفرع' });
    const { name, code, city, address } = req.body || {};
    if (!name) return res.status(400).json({ error: 'اسم الفرع مطلوب' });
    const info = db.prepare('INSERT INTO branches (name, code, city, address) VALUES (?,?,?,?)')
      .run(name, code || null, city || null, address || null);
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler);
