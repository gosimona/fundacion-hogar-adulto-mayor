const { getPool } = require('../../lib/db');
const { isAuthorized } = require('../../lib/adminAuth');

const PRICE_PER_NUMBER = 25000;

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
  const amount = Number.parseInt(body.amount, 10);

  if (!Number.isInteger(number) || number < 0 || number > 999) {
    res.status(400).json({ error: 'invalid_number' });
    return;
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: 'invalid_amount' });
    return;
  }

  const buyerName = typeof body.buyerName === 'string' && body.buyerName.trim() ? body.buyerName.trim() : null;
  const buyerPhone = typeof body.buyerPhone === 'string' && body.buyerPhone.trim() ? body.buyerPhone.trim() : null;
  const wallDisplayName = typeof body.wallDisplayName === 'string' && body.wallDisplayName.trim() ? body.wallDisplayName.trim() : null;
  const showOnWall = typeof body.showOnWall === 'boolean' ? body.showOnWall : null;

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE rifa_numeros
       SET amount_paid = LEAST(amount_paid + $2, ${PRICE_PER_NUMBER}),
           status = CASE WHEN amount_paid + $2 >= ${PRICE_PER_NUMBER} THEN 'sold' ELSE 'reserved' END,
           buyer_name = COALESCE($3, buyer_name),
           buyer_phone = COALESCE($4, buyer_phone),
           wall_display_name = COALESCE($5, wall_display_name),
           show_on_wall = COALESCE($6, show_on_wall),
           reserved_at = CASE WHEN amount_paid + $2 >= ${PRICE_PER_NUMBER} THEN reserved_at ELSE now() END,
           sold_at = CASE WHEN amount_paid + $2 >= ${PRICE_PER_NUMBER} THEN now() ELSE sold_at END
       WHERE number = $1
       RETURNING number, status, amount_paid, buyer_name, buyer_phone, wall_display_name, show_on_wall, sold_at`,
      [number, amount, buyerName, buyerPhone, wallDisplayName, showOnWall]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json({
      number: rows[0].number,
      status: rows[0].status,
      amountPaid: rows[0].amount_paid,
      remaining: PRICE_PER_NUMBER - rows[0].amount_paid,
      buyerName: rows[0].buyer_name,
      buyerPhone: rows[0].buyer_phone,
      wallDisplayName: rows[0].wall_display_name,
      showOnWall: rows[0].show_on_wall,
      soldAt: rows[0].sold_at,
    });
  } catch (err) {
    console.error('admin/registrar-pago error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
