// lib/whatsapp.js
// إرسال واتساب عبر واجهة Meta الرسمية (WhatsApp Business Cloud API)
// يحتاج 3 قيم محفوظة بجدول الإعدادات (تُدخل من صفحة الإعدادات بالنظام):
//   whatsapp_phone_number_id  - معرف رقم الهاتف بمنصة Meta for Developers
//   whatsapp_access_token     - Access Token دائم (System User Token)
//   whatsapp_template_name    - اسم القالب المعتمد لإرسال رسائل خارج نافذة الـ 24 ساعة (اختياري)

const db = require('./db');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => (obj[r.key] = r.value));
  return obj;
}

async function sendWhatsappMessage(phone, message) {
  const settings = getSettings();
  const phoneNumberId = settings.whatsapp_phone_number_id;
  const accessToken = settings.whatsapp_access_token;

  if (!phoneNumberId || !accessToken) {
    throw new Error('لم يتم ربط واتساب بعد - أضف بيانات الاتصال من صفحة الإعدادات أولاً');
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: cleanPhone,
    type: 'text',
    text: { body: message },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    // أشهر خطأ هنا: محاولة إرسال رسالة نصية حرة خارج نافذة الـ 24 ساعة بدون رد سابق من المستلم
    // الحل: إرسال عبر قالب رسالة (Template) معتمد مسبقاً من Meta
    const errMsg = data?.error?.message || 'فشل الإرسال عبر واتساب';
    throw new Error(errMsg);
  }

  return data;
}

// إرسال عبر قالب معتمد (مطلوب لأول رسالة أو بعد مرور 24 ساعة بدون رد من المستلم)
async function sendWhatsappTemplate(phone, templateName, languageCode = 'ar', components = []) {
  const settings = getSettings();
  const phoneNumberId = settings.whatsapp_phone_number_id;
  const accessToken = settings.whatsapp_access_token;
  if (!phoneNumberId || !accessToken) {
    throw new Error('لم يتم ربط واتساب بعد - أضف بيانات الاتصال من صفحة الإعدادات أولاً');
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: cleanPhone,
    type: 'template',
    template: { name: templateName, language: { code: languageCode }, components },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'فشل إرسال القالب عبر واتساب');
  return data;
}

module.exports = { sendWhatsappMessage, sendWhatsappTemplate };
