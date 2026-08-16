require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const DDL = `
CREATE TABLE IF NOT EXISTS rifa_numeros (
  number            SMALLINT PRIMARY KEY CHECK (number >= 0 AND number <= 999),
  status            TEXT NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available','reserved','sold')),
  buyer_name        TEXT,
  buyer_phone       TEXT,
  wall_display_name TEXT,
  show_on_wall      BOOLEAN NOT NULL DEFAULT false,
  reserved_at       TIMESTAMPTZ,
  sold_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rifa_numeros_status_idx ON rifa_numeros (status);
`;

const SEED = `
INSERT INTO rifa_numeros (number)
SELECT generate_series(0, 999)
ON CONFLICT (number) DO NOTHING;
`;

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query(DDL);
    const { rowCount } = await pool.query(SEED);
    console.log('Seeded', rowCount, 'new rows');
    const { rows } = await pool.query('SELECT count(*) FROM rifa_numeros');
    console.log('Total rows:', rows[0].count);
  } finally {
    await pool.end();
  }
})();
