const { Pool } = require('pg');
const { databaseUrl, nodeEnv } = require('../config/env');

let pool;

function getPool() {
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

module.exports = { getPool };
