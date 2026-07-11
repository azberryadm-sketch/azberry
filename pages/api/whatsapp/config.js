const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN ('whatsapp_phone_number_id','whatsapp_access_token','whatsapp_template_name')`).all();
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.key === 'whatsapp_access_token' ? (r.value ? '••••••••' + r.value.slice(-4) : '') : r.value; });
    return res.status(200).json({
      connected: !!(obj.whatsapp_phone_number_id && rows.find(r => r.key === 'whatsapp_access_token')?.value),
      config: obj,
    });
  }

  if (req.method === 'POST') {
    const { whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_name } = req.body || {};
    const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
    if (whatsapp_phone_number_id !== undefined) upsert.run('whatsapp_phone_number_id', whatsapp_phone_number_id);
    if (whatsapp_access_token) upsert.run('whatsapp_access_token', whatsapp_access_token); // ما نحدثه إذا جاي فاضي (يعني ما غيّره المستخدم)
    if (whatsapp_template_name !== undefined) upsert.run('whatsapp_template_name', whatsapp_template_name);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

export default requireAuth(handler, 'manage_settings');
