const { getPool } = require('../../lib/db');

const PRICE_PER_NUMBER = 25000;
const ABONO_DEADLINE = '2026-10-23 23:59:59-05';

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
          WHEN status = 'reserved' AND now() > '${ABONO_DEADLINE}'::timestamptz
            THEN 'available'
          WHEN status = 'reserved'
            THEN 'apartado'
          ELSE 'available'
        END AS status
      FROM rifa_numeros
      ORDER BY number
    `);

    const { rows: wallRows } = await pool.query(`
      WITH buyer_totals AS (
        SELECT buyer_phone, COUNT(*) AS ticket_count
        FROM rifa_numeros
        WHERE status = 'sold'
        GROUP BY buyer_phone
      ),
      wall_names AS (
        SELECT lower(btrim(wall_display_name)) AS name_key,
               (array_agg(btrim(wall_display_name) ORDER BY sold_at))[1] AS display_name,
               MIN(number) AS number,
               MIN(sold_at) AS first_sold_at,
               array_agg(DISTINCT buyer_phone) AS phones
        FROM rifa_numeros
        WHERE status = 'sold' AND show_on_wall = true
        GROUP BY lower(btrim(wall_display_name))
      )
      SELECT w.number, w.display_name AS wall_display_name
      FROM wall_names w
      ORDER BY
        (SELECT COALESCE(SUM(t.ticket_count), 0) FROM buyer_totals t WHERE t.buyer_phone = ANY(w.phones)) DESC,
        w.first_sold_at ASC
    `);

    const { rows: totalRows } = await pool.query(`SELECT COALESCE(SUM(amount_paid), 0) AS total FROM rifa_numeros`);

    let sold = 0;
    let apartado = 0;
    let available = 0;
    numberRows.forEach((r) => {
      if (r.status === 'sold') sold++;
      else if (r.status === 'apartado') apartado++;
      else available++;
    });

    res.status(200).json({
      numbers: numberRows.map((r) => ({ number: r.number, status: r.status })),
      summary: {
        sold,
        apartado,
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
