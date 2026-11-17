'use strict';

function createCommentModel(db) {
  async function listByProduct(productId, limit = 50) {
    const safeLimit = Math.min(Math.max(Math.trunc(Number(limit)) || 50, 1), 100);
    return db.execute(
      `SELECT c.id, c.content, c.image, c.created_at, c.user_id, u.username
         FROM comments c JOIN users u ON u.id = c.user_id
        WHERE c.product_id = ?
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT ${safeLimit}`,
      [productId]
    );
  }

  async function findById(id) {
    const rows = await db.execute(
      `SELECT c.id, c.product_id, c.user_id, c.content, c.image, c.created_at, u.username
         FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async function create({ productId, userId, content, image }) {
    const result = await db.execute(
      'INSERT INTO comments (product_id, user_id, content, image) VALUES (?, ?, ?, ?)',
      [productId, userId, content, image || null]
    );
    return result.insertId;
  }

  async function remove(id) {
    const result = await db.execute('DELETE FROM comments WHERE id = ?', [id]);
    return result.affectedRows;
  }

  return { listByProduct, findById, create, remove };
}

module.exports = { createCommentModel };
