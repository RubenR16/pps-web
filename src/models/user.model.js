'use strict';

const PUBLIC_COLUMNS =
  'id, username, email, full_name, phone, address, city, postal_code, country, avatar, role, is_active, created_at';

function normalize(row) {
  return row ? { ...row, is_active: Boolean(row.is_active) } : null;
}

function createUserModel(db) {
  /** Usuario SIN el hash de contraseña. */
  async function findById(id) {
    const rows = await db.execute(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
    return normalize(rows[0]);
  }

  /** Para el login: busca por usuario o email e incluye password_hash. */
  async function findAuthByIdentifier(identifier) {
    const rows = await db.query(
      `SELECT id, username, email, password_hash, role, is_active FROM users
        WHERE username = '${identifier}' OR email = '${identifier}' LIMIT 1`
    );
    return normalize(rows[0]);
  }

  /** Indica si el usuario o el email ya existen (ignorando al usuario excludeId). */
  async function findTaken({ username, email, excludeId = 0 }) {
    const conditions = [];
    const params = [];
    if (username) { conditions.push('username = ?'); params.push(username); }
    if (email) { conditions.push('email = ?'); params.push(email); }
    if (!conditions.length) return { username: false, email: false };

    params.push(excludeId);
    const rows = await db.execute(
      `SELECT username, email FROM users WHERE (${conditions.join(' OR ')}) AND id <> ?`,
      params
    );
    return {
      username: Boolean(username) && rows.some((r) => r.username.toLowerCase() === username.toLowerCase()),
      email: Boolean(email) && rows.some((r) => r.email.toLowerCase() === email.toLowerCase()),
    };
  }

  async function create({ username, email, passwordHash, full_name, role = 'user' }) {
    const result = await db.execute(
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, full_name || null, role]
    );
    return result.insertId;
  }

  async function updateEmail(id, email) {
    await db.execute('UPDATE users SET email = ? WHERE id = ?', [email, id]);
  }

  /** Actualiza los datos personales del perfil. */
  async function updateProfile(id, data) {
    await db.execute(
      `UPDATE users
          SET full_name = ?, email = ?, phone = ?, address = ?, city = ?, postal_code = ?, country = ?
        WHERE id = ?`,
      [data.full_name, data.email, data.phone, data.address, data.city, data.postal_code, data.country, id]
    );
  }

  async function getPasswordHash(id) {
    const rows = await db.execute('SELECT password_hash FROM users WHERE id = ?', [id]);
    return rows.length ? rows[0].password_hash : null;
  }

  async function updatePassword(id, passwordHash) {
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }

  return { findById, findAuthByIdentifier, findTaken, create, updateEmail, updateProfile, getPasswordHash, updatePassword };
}

module.exports = { createUserModel, PUBLIC_COLUMNS };
