const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'MeetingRoomBooking',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt:                process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_ENCRYPT !== 'true',
    enableArithAbort:       true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log(`✅ SQL Server connected: ${config.server} / ${config.database}`);
  }
  return pool;
}

function bindParams(req, params) {
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) {
      req.input(k, sql.NVarChar, null);
    } else if (typeof v === 'number' && Number.isInteger(v)) {
      req.input(k, sql.Int, v);
    } else if (typeof v === 'number') {
      req.input(k, sql.Float, v);
    } else if (typeof v === 'boolean') {
      req.input(k, sql.Bit, v ? 1 : 0);
    } else {
      req.input(k, sql.NVarChar(sql.MAX), String(v));
    }
  }
}

const query = async (sqlStr, params = {}) => {
  const p = await getPool();
  const req = p.request();
  bindParams(req, params);
  const result = await req.query(sqlStr);
  return result.recordset;
};

const queryOne = async (sqlStr, params = {}) => {
  const rows = await query(sqlStr, params);
  return rows[0] ?? null;
};

// execute dùng cho INSERT/UPDATE/DELETE
// INSERT tự động nối SCOPE_IDENTITY() để lấy lastInsertRowid
const execute = async (sqlStr, params = {}) => {
  const p = await getPool();
  const req = p.request();
  bindParams(req, params);

  const isInsert = /^\s*INSERT\s/i.test(sqlStr.trim());
  const finalSql = isInsert ? `${sqlStr}; SELECT SCOPE_IDENTITY() AS id` : sqlStr;

  const result = await req.query(finalSql);
  // Sau INSERT + SELECT SCOPE_IDENTITY(), result.recordset là recordset cuối (chứa id)
  const lastId = isInsert ? (result.recordset?.[0]?.id ?? null) : null;

  return {
    recordset:      result.recordsets?.[0] || [],
    rowsAffected:   result.rowsAffected    || [0],
    lastInsertRowid: lastId !== null ? parseInt(lastId) : null,
  };
};

module.exports = { query, queryOne, execute, getPool, sql };
