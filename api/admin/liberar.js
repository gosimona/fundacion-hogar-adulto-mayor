const { getPool } = require('../../lib/db');
const { isAuthorized } = require('../../lib/adminAuth');

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const body = parseBody(req);
  const number = Number.parseInt(body.number, 10);
  if (!Number.isInteger(number) || number < 0 || number > 999) {
    res.status(400).json({ error: 'invalid_number' });
    return;
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE rifa_numeros
       SET status = 'available',
           buyer_name = NULL, buyer_phone = NULL,
           wall_display_name = NULL, show_on_wall = false,
           reserved_at = NULL, sold_at = NULL
       WHERE number = $1
       RETURNING number, status`,
      [number]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json({ number: rows[0].number, status: rows[0].status });
  } catch (err) {
    console.error('admin/liberar error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
