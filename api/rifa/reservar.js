const { getPool } = require('../../lib/db');

const HOLD_MINUTES = 45;

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

  const body = parseBody(req);
  const number = Number.parseInt(body.number, 10);
  const buyerName = typeof body.buyerName === 'string' ? body.buyerName.trim() : '';
  const buyerPhone = typeof body.buyerPhone === 'string' ? body.buyerPhone.trim() : '';
  const showOnWall = body.showOnWall === true;
  let wallDisplayName = typeof body.wallDisplayName === 'string' ? body.wallDisplayName.trim() : '';

  if (!Number.isInteger(number) || number < 0 || number > 999) {
    res.status(400).json({ error: 'invalid_number' });
    return;
  }
  if (buyerName.length < 2 || buyerName.length > 80) {
    res.status(400).json({ error: 'invalid_name' });
    return;
  }
  if (!/^[0-9+\s()-]{7,20}$/.test(buyerPhone)) {
    res.status(400).json({ error: 'invalid_phone' });
    return;
  }
  if (showOnWall && (wallDisplayName.length < 2 || wallDisplayName.length > 80)) {
    res.status(400).json({ error: 'invalid_wall_name' });
    return;
  }
  if (!showOnWall) wallDisplayName = null;

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE rifa_numeros
       SET status = 'reserved',
           buyer_name = $2,
           buyer_phone = $3,
           wall_display_name = $4,
           show_on_wall = $5,
           reserved_at = now()
       WHERE number = $1
         AND (
           status = 'available'
           OR (status = 'reserved' AND reserved_at < now() - interval '${HOLD_MINUTES} minutes')
         )
       RETURNING number, status, reserved_at`,
      [number, buyerName, buyerPhone, wallDisplayName, showOnWall]
    );

    if (rows.length === 0) {
      res.status(409).json({ error: 'unavailable' });
      return;
    }

    res.status(200).json({
      number: rows[0].number,
      status: rows[0].status,
      reservedAt: rows[0].reserved_at,
      holdMinutes: HOLD_MINUTES,
    });
  } catch (err) {
    console.error('rifa/reservar error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
