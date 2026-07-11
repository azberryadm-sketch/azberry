const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const sections = db.prepare('SELECT * FROM sections WHERE active=1 ORDER BY sort_order, id').all();
    return res.status(200).json({ sections });
  }

  if (req.method === 'POST') {
    const { name, description, min_score, category } = req.body || {};
    if (!name) return res.status(400).json({ error: 'اسم القسم مطلوب' });
    const maxOrder = db.prepare('SELECT MAX(sort_order) m FROM sections').get().m || 0;
    const info = db.prepare('INSERT INTO sections (name, description, sort_order, min_score, category) VALUES (?,?,?,?,?)')
      .run(name, description || null, maxOrder + 1, min_score || 3, category || 'عام');
    return res.status(201).json({ id: info.lastInsertRowid });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_sections');
