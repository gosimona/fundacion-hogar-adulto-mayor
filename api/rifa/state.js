const { getPool } = require('../../lib/db');

const HOLD_MINUTES = 45;
const PRICE_PER_NUMBER = 25000;
const ABONO_DEADLINE = '2026-10-11 23:59:59-05';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const pool = getPool();

    const { rows: numberRows } = await pool.query(`
      SELECT number, amount_paid,
        CASE
          WHEN status = 'sold' THEN 'sold'
          WHEN status = 'reserved' AND amount_paid = 0 AND reserved_at < now() - interval '${HOLD_MINUTES} minutes'
            THEN 'available'
          WHEN status = 'reserved' AND amount_paid > 0 AND now() > '${ABONO_DEADLINE}'::timestamptz
            THEN 'available'
          WHEN status = 'reserved' AND amount_paid > 0
            THEN 'apartado'
          WHEN status = 'reserved'
            THEN 'reserved'
          ELSE 'available'
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

    const { rows: totalRows } = await pool.query(`SELECT COALESCE(SUM(amount_paid), 0) AS total FROM rifa_numeros`);

    let sold = 0;
    let apartado = 0;
    let reserved = 0;
    let available = 0;
    numberRows.forEach((r) => {
      if (r.status === 'sold') sold++;
      else if (r.status === 'apartado') apartado++;
      else if (r.status === 'reserved') reserved++;
      else available++;
    });

    res.status(200).json({
      numbers: numberRows.map((r) => ({ number: r.number, status: r.status })),
      summary: {
        sold,
        apartado,
        reserved,
        available,
        total: numberRows.length,
        amountRaisedCOP: Number(totalRows[0].total),
        pricePerNumber: PRICE_PER_NUMBER,
      },
      wall: wallRows.map((r) => ({ number: r.number, displayName: r.wall_display_name })),
    });
  } catch (err) {
    console.error('rifa/state error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
