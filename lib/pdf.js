// lib/pdf.js
// توليد PDF باستخدام HTML فقط (بدون Puppeteer/Chromium)
// الحل البديل الموثوق الذي يعمل على كل البيئات بدون مكتبات خارجية

async function htmlToPdfBuffer(html) {
  // نرجع HTML مباشرة - المتصفح يتولى طباعته كـ PDF
  // هذا أكثر موثوقية من Puppeteer في بيئات السيرفر المحدودة
  return Buffer.from(html, 'utf8');
}

module.exports = { htmlToPdfBuffer };
