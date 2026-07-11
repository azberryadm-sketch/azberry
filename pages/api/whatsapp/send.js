const { requireAuth } = require('../../../lib/auth');
const { hasPermission } = require('../../../lib/permissions');
const { sendWhatsappMessage } = require('../../../lib/whatsapp');

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!hasPermission(req.user, 'manage_announcements')) return res.status(403).json({ error: 'لا تملك صلاحية الإرسال' });

  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: 'رقم الهاتف والرسالة مطلوبان' });

  try {
    await sendWhatsappMessage(phone, message);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'فشل الإرسال عبر واتساب' });
  }
}

export default requireAuth(handler);
