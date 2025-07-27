const { Pool } = require('pg');

const pool = new Pool({
  user: 'unicollab_user',
  host: 'localhost',
  database: 'unicollab_db',
  password: 'hakim97',
  port: 5433,
});

module.exports = pool;
