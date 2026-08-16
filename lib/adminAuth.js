const crypto = require('crypto');

function isAuthorized(req) {
  const expected = process.env.RIFA_ADMIN_PIN;
  const provided = req.headers['x-rifa-admin-pin'];
  if (!expected || !provided) return false;

  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

module.exports = { isAuthorized };
