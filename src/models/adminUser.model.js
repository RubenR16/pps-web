'use strict';

const { escapeLike } = require('../utils/pagination');

function createAdminUserModel(db) {
  async function list({ search, limit, offset }) {
    const where = [];
    const params = [];
    if (search) {
      where.push('(u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
      const like = `%${escapeLike(search)}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await db.execute(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
    const rows = await db.execute(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
         FROM users u ${whereSql} ORDER BY u.id ASC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    return {
      items: rows.map((r) => ({ ...r, is_active: Boolean(r.is_active), order_count: Number(r.order_count) })),
      total,
    };
  }

  /** Solo se pueden cambiar el rol y el estado de la cuenta (lista cerrada). */
  async function updateAccess(id, { role, is_active: isActive }) {
    const sets = [];
    const params = [];
    if (role !== undefined) { sets.push('role = ?'); params.push(role); }
    if (isActive !== undefined) { sets.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    if (!sets.length) return;
    params.push(id);
    await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  return { list, updateAccess };
}

module.exports = { createAdminUserModel };
