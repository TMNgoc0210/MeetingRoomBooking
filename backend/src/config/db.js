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
  connectionTimeout: 15000,
  requestTimeout:    30000,
  pool: { max: 10, min: 2, idleTimeoutMillis: 120000 },
};

let pool = null;
let keepaliveTimer = null;

// Tắt SQL Server Express auto-close và bắt đầu keepalive ping
async function postConnect(p) {
  // Tắt auto-close để DB không ngủ giữa chừng
  try {
    await p.request().query(
      `IF EXISTS (SELECT 1 FROM sys.databases WHERE name = '${config.database}' AND is_auto_close_on = 1)
         ALTER DATABASE [${config.database}] SET AUTO_CLOSE OFF`
    );
    console.log('[DB] AUTO_CLOSE OFF applied');
  } catch (_) { /* bỏ qua nếu không đủ quyền */ }

  // Keepalive: ping SELECT 1 mỗi 4 phút để giữ kết nối sống
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  keepaliveTimer = setInterval(async () => {
    if (!pool) return;
    try {
      await pool.request().query('SELECT 1 AS ping');
    } catch {
      console.warn('[DB] Keepalive failed — resetting pool');
      try { await pool.close(); } catch (_) {}
      pool = null;
    }
  }, 4 * 60 * 1000); // 4 phút
  if (keepaliveTimer.unref) keepaliveTimer.unref(); // không block process exit
}

async function getPool() {
  if (pool) return pool;
  pool = await sql.connect(config);
  console.log(`✅ SQL Server connected: ${config.server} / ${config.database}`);
  await postConnect(pool);
  return pool;
}

function isConnectionError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === 'ECONNRESET'      ||
    code === 'ESOCKET'         ||
    code === 'ECONNREFUSED'    ||
    code === 'ETIMEOUT'        ||
    code === 'ECONNCLOSED'     ||
    msg.includes('connection lost')     ||
    msg.includes('socket hang up')      ||
    msg.includes('connection is closed') ||
    msg.includes('closed')              ||
    msg.includes('econnclosed')         ||
    msg.includes('timeout')             ||
    msg.includes('failed to connect')
  );
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

async function runWithRetry(fn) {
  try {
    return await fn(await getPool());
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn('[DB] Connection stale, reconnecting...', err.code || err.message);
      try { await pool.close(); } catch (_) {}
      pool = null;
      return await fn(await getPool());
    }
    throw err;
  }
}

const query = (sqlStr, params = {}) =>
  runWithRetry(async (p) => {
    const req = p.request();
    bindParams(req, params);
    const result = await req.query(sqlStr);
    return result.recordset;
  });

const queryOne = async (sqlStr, params = {}) => {
  const rows = await query(sqlStr, params);
  return rows[0] ?? null;
};

const execute = (sqlStr, params = {}) =>
  runWithRetry(async (p) => {
    const req = p.request();
    bindParams(req, params);

    const isInsert = /^\s*INSERT\s/i.test(sqlStr.trim());
    const finalSql = isInsert ? `${sqlStr}; SELECT SCOPE_IDENTITY() AS id` : sqlStr;

    const result = await req.query(finalSql);
    const lastId = isInsert ? (result.recordset?.[0]?.id ?? null) : null;

    return {
      recordset:       result.recordsets?.[0] || [],
      rowsAffected:    result.rowsAffected    || [0],
      lastInsertRowid: lastId !== null ? parseInt(lastId) : null,
    };
  });

module.exports = { query, queryOne, execute, getPool, sql };
