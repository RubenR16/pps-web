'use strict';

const mysql = require('mysql2/promise');

/** Pool de conexiones MySQL/MariaDB (XAMPP). */
function createDb(dbConfig) {
  const pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: dbConfig.connectionLimit,
    charset: 'utf8mb4',
    decimalNumbers: true,
    multipleStatements: false,
  });

  /** Consulta con parámetros (?). */
  async function execute(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  /** Consulta con el SQL ya montado. */
  async function query(sql) {
    const [rows] = await pool.query(sql);
    return rows;
  }

  /**
   * Ejecuta fn(tx) dentro de una transacción. tx.execute funciona como db.execute pero sobre
   * una única conexión. Si fn lanza un error se hace rollback; si no, commit.
   */
  async function transaction(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const tx = {
        execute: async (sql, params = []) => {
          const [rows] = await conn.execute(sql, params);
          return rows;
        },
      };
      const result = await fn(tx);
      await conn.commit();
      return result;
    } catch (err) {
      try { await conn.rollback(); } catch (rollbackErr) { /* se ignora: se relanza el error original */ }
      throw err;
    } finally {
      conn.release();
    }
  }

  async function testConnection() {
    const rows = await execute('SELECT VERSION() AS version, DATABASE() AS db');
    return rows[0];
  }

  async function close() {
    await pool.end();
  }

  return { pool, execute, query, transaction, testConnection, close };
}

module.exports = { createDb };
