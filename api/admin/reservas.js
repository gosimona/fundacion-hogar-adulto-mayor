const { getPool } = require('../../lib/db');
const { isAuthorized } = require('../../lib/adminAuth');

const HOLD_MINUTES = 45;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT number,
        CASE
          WHEN status = 'reserved' AND reserved_at < now() - interval '${HOLD_MINUTES} minutes'
            THEN 'available'
          ELSE status
        END AS effective_status,
        buyer_name, buyer_phone, wall_display_name, show_on_wall,
        reserved_at, sold_at
      FROM rifa_numeros
      WHERE status != 'available'
      ORDER BY COALESCE(sold_at, reserved_at) DESC
    `);

    const items = rows
      .filter((r) => r.effective_status !== 'available')
      .map((r) => ({
        number: r.number,
        status: r.effective_status,
        buyerName: r.buyer_name,
        buyerPhone: r.buyer_phone,
        wallDisplayName: r.wall_display_name,
        showOnWall: r.show_on_wall,
        reservedAt: r.reserved_at,
        soldAt: r.sold_at,
      }));

    res.status(200).json({ items });
  } catch (err) {
    console.error('admin/reservas error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
