const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'meeting_booking.db');
const db = new Database(dbPath);

// Bật WAL mode (hiệu năng tốt hơn)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tạo bảng AI_Chat_Log nếu chưa có
db.exec(`
  CREATE TABLE IF NOT EXISTS "AI_Chat_Log" (
    LogID       INTEGER PRIMARY KEY AUTOINCREMENT,
    UserMessage TEXT    NOT NULL,
    AI_JSON     TEXT    NOT NULL,
    CreateDate  TEXT    DEFAULT (datetime('now','localtime'))
  );
`);

console.log('✅ SQLite connected:', dbPath);

/**
 * Convert @paramName → :paramName cho SQLite
 * Convert SQL Server brackets [Tên] → "Tên"
 */
const convertParams = (sql, params) => {
  // Convert [TableName] → "TableName"  
  let sqlStr = sql.replace(/\[([^\]]+)\]/g, '"$1"');

  // Convert @paramName → :paramName
  sqlStr = sqlStr.replace(/@(\w+)/g, ':$1');

  // Convert GETDATE() → datetime('now','localtime')
  sqlStr = sqlStr.replace(/GETDATE\(\)/gi, "datetime('now','localtime')");

  // Convert LIKE N'%' + @x + '%' → LIKE '%' || :x || '%'
  sqlStr = sqlStr.replace(/LIKE\s+N?'%'\s*\+\s*:(\w+)\s*\+\s*'%'/gi, "LIKE '%' || :$1 || '%'");

  // Convert OUTPUT INSERTED.xxx → (handle via lastInsertRowid)
  sqlStr = sqlStr.replace(/OUTPUT\s+INSERTED\.\w+/gi, '');

  // Convert BIT literals
  sqlStr = sqlStr.replace(/\b1\b(?=\s*--\s*true)/gi, '1');

  // Prefix params với : cho SQLite
  const sqliteParams = {};
  Object.entries(params).forEach(([k, v]) => {
    // Convert boolean to 0/1
    if (typeof v === 'boolean') sqliteParams[k] = v ? 1 : 0;
    else sqliteParams[k] = v;
  });

  return { sqlStr, sqliteParams };
};

/**
 * Query trả về nhiều rows — wrapped in Promise for async/await compatibility
 */
const query = (sql, params = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const { sqlStr, sqliteParams } = convertParams(sql, params);
      const stmt = db.prepare(sqlStr);
      resolve(stmt.all(sqliteParams));
    } catch (err) {
      console.error('[DB] Query error:', err.message);
      console.error('[DB] SQL:', sql);
      reject(err);
    }
  });
};

/**
 * Query trả về 1 row — wrapped in Promise
 */
const queryOne = (sql, params = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const { sqlStr, sqliteParams } = convertParams(sql, params);
      const stmt = db.prepare(sqlStr);
      resolve(stmt.get(sqliteParams) || null);
    } catch (err) {
      console.error('[DB] QueryOne error:', err.message);
      reject(err);
    }
  });
};

/**
 * Execute INSERT/UPDATE/DELETE — wrapped in Promise, trả về { recordset, rowsAffected, lastInsertRowid }
 */
const execute = (sql, params = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const { sqlStr, sqliteParams } = convertParams(sql, params);
      const stmt = db.prepare(sqlStr);
      const info = stmt.run(sqliteParams);
      // Giả lập recordset giống mssql cũ
      resolve({
        recordset: info.lastInsertRowid ? [{ id: info.lastInsertRowid }] : [],
        rowsAffected: [info.changes],
        lastInsertRowid: info.lastInsertRowid,
      });
    } catch (err) {
      console.error('[DB] Execute error:', err.message);
      console.error('[DB] SQL:', sql);
      reject(err);
    }
  });
};

// Stub cho backwards compatibility
const getPool = () => Promise.resolve(db);

module.exports = { query, queryOne, execute, db, getPool };

