// lib/auth.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const db = require('./db');
const { hasPermission } = require('./permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-.env';
const COOKIE_NAME = 'branch_inspect_token';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { path: '/', maxAge: -1 }));
}

function getUserFromReq(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

// حماية API routes: requireAuth(handler) أو requireAuth(handler, 'manage_users')
function requireAuth(handler, requiredPermission = null) {
  return async (req, res) => {
    const tokenUser = getUserFromReq(req);
    if (!tokenUser) return res.status(401).json({ error: 'غير مصرح - الرجاء تسجيل الدخول' });

    const db = require('./db');
    const { hasPermission } = require('./permissions');
    const freshUser = db.prepare('SELECT id, username, full_name, role, permissions, active FROM users WHERE id = ?').get(tokenUser.id);
    if (!freshUser || !freshUser.active) return res.status(401).json({ error: 'الحساب غير نشط' });

    if (requiredPermission && !hasPermission(freshUser, requiredPermission)) {
      return res.status(403).json({ error: 'لا تملك صلاحية الوصول لهذه الميزة' });
    }
    req.user = freshUser;
    return handler(req, res);
  };
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie, getUserFromReq, requireAuth, COOKIE_NAME };
