const { getPool } = require('../../lib/db');

const HOLD_MINUTES = 45;
const PRICE_PER_NUMBER = 25000;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const pool = getPool();

    const { rows: numberRows } = await pool.query(`
      SELECT number,
        CASE
          WHEN status = 'reserved' AND reserved_at < now() - interval '${HOLD_MINUTES} minutes'
            THEN 'available'
          ELSE status
        END AS status
      FROM rifa_numeros
      ORDER BY number
    `);

    const { rows: wallRows } = await pool.query(`
      SELECT number, wall_display_name
      FROM rifa_numeros
      WHERE status = 'sold' AND show_on_wall = true
      ORDER BY sold_at DESC
    `);

    let sold = 0;
    let reserved = 0;
    let available = 0;
    numberRows.forEach((r) => {
      if (r.status === 'sold') sold++;
      else if (r.status === 'reserved') reserved++;
      else available++;
    });

    res.status(200).json({
      numbers: numberRows.map((r) => ({ number: r.number, status: r.status })),
      summary: {
        sold,
        reserved,
        available,
        total: numberRows.length,
        amountRaisedCOP: sold * PRICE_PER_NUMBER,
        pricePerNumber: PRICE_PER_NUMBER,
      },
      wall: wallRows.map((r) => ({ number: r.number, displayName: r.wall_display_name })),
    });
  } catch (err) {
    console.error('rifa/state error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
