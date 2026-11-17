'use strict';

const { escapeLike } = require('../utils/pagination');

const COLUMNS = `p.id, p.name, p.description, p.price, p.stock, p.image, p.is_featured, p.is_active,
                 p.category_id, c.name AS category_name, p.created_at`;

function normalize(row) {
  return row ? { ...row, is_featured: Boolean(row.is_featured), is_active: Boolean(row.is_active) } : null;
}

/** Productos para el panel de administración: incluye los desactivados. */
function createAdminProductModel(db) {
  async function list({ search, limit, offset }) {
    const where = [];
    const params = [];
    if (search) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      const like = `%${escapeLike(search)}%`;
      params.push(like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await db.execute(`SELECT COUNT(*) AS total FROM products p ${whereSql}`, params);
    const rows = await db.execute(
      `SELECT ${COLUMNS} FROM products p LEFT JOIN categories c ON c.id = p.category_id
        ${whereSql} ORDER BY p.id DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    return { items: rows.map(normalize), total };
  }

  async function findById(id) {
    const rows = await db.execute(
      `SELECT ${COLUMNS} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
      [id]
    );
    return normalize(rows[0]);
  }

  async function create(v) {
    const result = await db.execute(
      `INSERT INTO products (category_id, name, description, price, stock, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [v.category_id, v.name, v.description, v.price, v.stock, v.is_featured ? 1 : 0, v.is_active ? 1 : 0]
    );
    return result.insertId;
  }

  async function update(id, v) {
    await db.execute(
      `UPDATE products
          SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, is_featured = ?, is_active = ?
        WHERE id = ?`,
      [v.category_id, v.name, v.description, v.price, v.stock, v.is_featured ? 1 : 0, v.is_active ? 1 : 0, id]
    );
  }

  async function setImage(id, imageUrl) {
    await db.execute('UPDATE products SET image = ? WHERE id = ?', [imageUrl, id]);
  }

  async function remove(id) {
    const result = await db.execute('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows;
  }

  return { list, findById, create, update, setImage, remove };
}

module.exports = { createAdminProductModel };
