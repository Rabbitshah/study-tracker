const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Ensure learned_vocab table is created
pool.query(`
  CREATE TABLE IF NOT EXISTS learned_vocab (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    group_name  VARCHAR(50) NOT NULL,
    word        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, group_name, word)
  );
  CREATE INDEX IF NOT EXISTS idx_learned_vocab_user ON learned_vocab(user_id);
`).then(() => {
  console.log('[DB] learned_vocab table initialized');
}).catch(err => {
  console.error('[DB] Error initializing learned_vocab table:', err.message);
});

module.exports = pool;
