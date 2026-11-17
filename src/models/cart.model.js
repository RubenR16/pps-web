'use strict';

function createCartModel(db) {
  /** Asegura que el usuario tiene carrito y devuelve su id. */
  async function getOrCreateCartId(userId) {
    await db.execute('INSERT IGNORE INTO carts (user_id) VALUES (?)', [userId]);
    const rows = await db.execute('SELECT id FROM carts WHERE user_id = ?', [userId]);
    return rows[0].id;
  }

  async function listItems(userId) {
    return db.execute(
      `SELECT ci.product_id, ci.quantity,
              p.name, p.price, p.stock, p.image, p.is_active,
              cat.slug AS category_slug
         FROM carts c
         JOIN cart_items ci ON ci.cart_id = c.id
         JOIN products p ON p.id = ci.product_id
         LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE c.user_id = ?
        ORDER BY ci.id`,
      [userId]
    );
  }

  async function countItems(userId) {
    const rows = await db.execute(
      `SELECT COALESCE(SUM(ci.quantity), 0) AS item_count
         FROM carts c JOIN cart_items ci ON ci.cart_id = c.id
        WHERE c.user_id = ?`,
      [userId]
    );
    return Number(rows[0].item_count);
  }

  /** Cantidad actual de un producto en el carrito (0 si no está). */
  async function getQuantity(userId, productId) {
    const rows = await db.execute(
      `SELECT ci.quantity
         FROM carts c JOIN cart_items ci ON ci.cart_id = c.id
        WHERE c.user_id = ? AND ci.product_id = ?`,
      [userId, productId]
    );
    return rows.length ? rows[0].quantity : 0;
  }

  async function setQuantity(userId, productId, quantity) {
    const cartId = await getOrCreateCartId(userId);
    await db.execute(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
      [cartId, productId, quantity]
    );
  }

  async function removeItem(userId, productId) {
    const result = await db.execute(
      `DELETE FROM cart_items
        WHERE product_id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)`,
      [productId, userId]
    );
    return result.affectedRows;
  }

  async function clear(userId) {
    await db.execute(
      'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)',
      [userId]
    );
  }

  return { getOrCreateCartId, listItems, countItems, getQuantity, setQuantity, removeItem, clear };
}

module.exports = { createCartModel };
