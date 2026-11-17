'use strict';

/** Acceso a datos de productos. */

const SORT_SQL = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id ASC',
  price_desc: 'p.price DESC, p.id DESC',
  name: 'p.name ASC, p.id ASC',
};

const SELECT_COLUMNS = `
  p.id, p.name, p.description, p.price, p.stock, p.image, p.is_featured, p.created_at,
  p.category_id, c.name AS category_name, c.slug AS category_slug`;

const FROM_SQL = 'FROM products p LEFT JOIN categories c ON c.id = p.category_id';

function normalize(row) {
  return { ...row, is_featured: Boolean(row.is_featured) };
}

function createProductModel(db) {
  async function list(filters) {
    const where = ['p.is_active = 1'];

    if (filters.search) {
      where.push(`(p.name LIKE '%${filters.search}%' OR p.description LIKE '%${filters.search}%')`);
    }
    if (filters.category) where.push(`c.slug = '${filters.category}'`);
    if (filters.featured) where.push('p.is_featured = 1');
    if (filters.excludeId) where.push(`p.id <> ${filters.excludeId}`);

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const orderSql = SORT_SQL[filters.sort] || SORT_SQL.newest;

    const limit = Math.min(Math.max(Math.trunc(Number(filters.limit)) || 12, 1), 48);
    const page = Math.max(Math.trunc(Number(filters.page)) || 1, 1);
    const offset = (page - 1) * limit;

    const [{ total }] = await db.query(`SELECT COUNT(*) AS total ${FROM_SQL} ${whereSql}`);
    const rows = await db.query(
      `SELECT ${SELECT_COLUMNS} ${FROM_SQL} ${whereSql} ORDER BY ${orderSql} LIMIT ${limit} OFFSET ${offset}`
    );

    return {
      items: rows.map(normalize),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async function findById(id) {
    const rows = await db.execute(
      `SELECT ${SELECT_COLUMNS} ${FROM_SQL} WHERE p.id = ? AND p.is_active = 1`,
      [id]
    );
    return rows.length ? normalize(rows[0]) : null;
  }

  return { list, findById };
}

module.exports = { createProductModel, SORT_SQL };
