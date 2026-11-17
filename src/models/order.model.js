'use strict';

const { HttpError } = require('../utils/httpError');
const { computeTotals, toCents } = require('../services/pricing.service');

function createOrderModel(db) {
  /**
   * Checkout: crea el pedido con los artículos que envía el carrito, descuenta stock y
   * vacía el carrito del usuario, todo dentro de una transacción.
   * items: [{ productId, quantity, price }]
   */
  async function create(userId, items, shipping, status) {
    return db.transaction(async (tx) => {
      const lines = [];
      for (const item of items) {
        const [product] = await tx.execute(
          'SELECT id, name, stock, is_active FROM products WHERE id = ? FOR UPDATE',
          [item.productId]
        );
        if (!product) throw new HttpError(404, `Producto ${item.productId} no encontrado.`);
        if (!product.is_active) throw new HttpError(409, `"${product.name}" ya no está disponible.`);
        if (product.stock < item.quantity) {
          throw new HttpError(409, `No hay stock suficiente de "${product.name}" (quedan ${product.stock}).`);
        }
        lines.push({ ...item, name: product.name });
      }

      const totals = computeTotals(lines);
      const inserted = await tx.execute(
        `INSERT INTO orders
           (user_id, status, total, shipping_name, shipping_address, shipping_city,
            shipping_postal_code, shipping_country, shipping_phone, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, status, totals.total, shipping.shipping_name, shipping.shipping_address,
          shipping.shipping_city, shipping.shipping_postal_code, shipping.shipping_country,
          shipping.shipping_phone, shipping.payment_method]
      );
      const orderId = inserted.insertId;

      for (const line of lines) {
        await tx.execute(
          'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)',
          [orderId, line.productId, line.name, line.price, line.quantity]
        );
        await tx.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [line.quantity, line.productId]);
      }

      await tx.execute(
        'DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)',
        [userId]
      );
      return orderId;
    });
  }

  /** Historial de pedidos de un usuario (más recientes primero). */
  async function listByUser(userId) {
    const rows = await db.execute(
      `SELECT o.id, o.status, o.total, o.payment_method, o.created_at,
              COALESCE(SUM(oi.quantity), 0) AS item_count
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ?
        GROUP BY o.id, o.status, o.total, o.payment_method, o.created_at
        ORDER BY o.created_at DESC, o.id DESC`,
      [userId]
    );
    return rows.map((r) => ({ ...r, item_count: Number(r.item_count) }));
  }

  /** Detalle de un pedido con sus líneas. */
  async function findById(orderId) {
    const orders = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!orders.length) return null;

    const items = await db.execute(
      'SELECT product_id, product_name, unit_price, quantity FROM order_items WHERE order_id = ? ORDER BY id',
      [orderId]
    );
    const order = orders[0];
    const detailed = items.map((i) => ({ ...i, line_total: (toCents(i.unit_price) * i.quantity) / 100 }));
    const subtotalCents = detailed.reduce((sum, i) => sum + toCents(i.line_total), 0);

    return {
      ...order,
      items: detailed,
      subtotal: subtotalCents / 100,
      shipping_cost: (toCents(order.total) - subtotalCents) / 100,
    };
  }

  return { create, listByUser, findById };
}

module.exports = { createOrderModel };
