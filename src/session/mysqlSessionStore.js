'use strict';

/**
 * Almacén de sesiones de express-session sobre MySQL/MariaDB (tabla "sessions", que se crea sola).
 * Uso:  const MySqlSessionStore = require('./session/mysqlSessionStore')(require('express-session'));
 */
module.exports = function (session) {
  const CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS sessions (
      session_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      expires    BIGINT UNSIGNED NOT NULL,
      data       MEDIUMTEXT NOT NULL,
      PRIMARY KEY (session_id),
      KEY idx_sessions_expires (expires)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

  class MySqlSessionStore extends session.Store {
    constructor(db, { ttlMs = 2 * 60 * 60 * 1000, cleanupIntervalMs = 15 * 60 * 1000 } = {}) {
      super();
      this.db = db;
      this.ttlMs = ttlMs;
      this.cleanupIntervalMs = cleanupIntervalMs;
      this.timer = null;
    }

    /** Crea la tabla si no existe y arranca la limpieza periódica de sesiones caducadas. */
    async init() {
      await this.db.query(CREATE_TABLE);
      await this.purgeExpired();
      this.timer = setInterval(() => this.purgeExpired().catch(() => {}), this.cleanupIntervalMs);
      if (this.timer.unref) this.timer.unref();
    }

    async purgeExpired() {
      await this.db.execute('DELETE FROM sessions WHERE expires <= ?', [Date.now()]);
    }

    close() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }

    expiresAt(sess) {
      const fromCookie = sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : NaN;
      return Number.isFinite(fromCookie) ? fromCookie : Date.now() + this.ttlMs;
    }

    get(sid, cb) {
      this.db
        .execute('SELECT data FROM sessions WHERE session_id = ? AND expires > ?', [sid, Date.now()])
        .then((rows) => (rows.length ? JSON.parse(rows[0].data) : null))
        .then((sess) => cb(null, sess), (err) => cb(err));
    }

    set(sid, sess, cb) {
      this.db
        .execute(
          `INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
          [sid, this.expiresAt(sess), JSON.stringify(sess)]
        )
        .then(() => cb(null), (err) => cb(err));
    }

    touch(sid, sess, cb) {
      this.db
        .execute('UPDATE sessions SET expires = ? WHERE session_id = ?', [this.expiresAt(sess), sid])
        .then(() => cb(null), (err) => cb(err));
    }

    destroy(sid, cb) {
      this.db
        .execute('DELETE FROM sessions WHERE session_id = ?', [sid])
        .then(() => cb(null), (err) => cb(err));
    }
  }

  return MySqlSessionStore;
};
