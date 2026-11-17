'use strict';

const { HttpError } = require('../utils/httpError');
const { canTransition, allowedNext } = require('../services/orderStatus.service');
const { toCents } = require('../services/pricing.service');

function createAdminOrderModel(db) {
  async function list({ status, limit, offset }) {
    const whereSql = status ? 'WHERE o.status = ?' : '';
    const params = status ? [status] : [];

    const [{ total }] = await db.execute(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`, params);
    const rows = await db.execute(
      `SELECT o.id, o.status, o.total, o.created_at, o.user_id, u.username, u.email,
              COALESCE(SUM(oi.quantity), 0) AS item_count
         FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         ${whereSql}
        GROUP BY o.id, o.status, o.total, o.created_at, o.user_id, u.username, u.email
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    return { items: rows.map((r) => ({ ...r, item_count: Number(r.item_count) })), total };
  }

  async function findById(id) {
    const orders = await db.execute(
      `SELECT o.*, u.username, u.email
         FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.id = ?`,
      [id]
    );
    if (!orders.length) return null;

    const items = await db.execute(
      'SELECT product_id, product_name, unit_price, quantity FROM order_items WHERE order_id = ? ORDER BY id',
      [id]
    );
    const order = orders[0];
    const detailed = items.map((i) => ({ ...i, line_total: (toCents(i.unit_price) * i.quantity) / 100 }));
    const subtotalCents = detailed.reduce((sum, i) => sum + toCents(i.line_total), 0);

    return {
      ...order,
      items: detailed,
      subtotal: subtotalCents / 100,
      shipping_cost: (toCents(order.total) - subtotalCents) / 100,
      allowed_statuses: allowedNext(order.status),
    };
  }

  /**
   * Cambia el estado respetando las transiciones permitidas. Al cancelar se devuelve el stock
   * de las líneas. Todo en una transacción con el pedido bloqueado.
   */
  async function updateStatus(id, newStatus) {
    return db.transaction(async (tx) => {
      const rows = await tx.execute('SELECT status FROM orders WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) throw new HttpError(404, 'Pedido no encontrado.');

      const current = rows[0].status;
      if (!canTransition(current, newStatus)) {
        throw new HttpError(409, `No se puede pasar un pedido de "${current}" a "${newStatus}".`);
      }

      if (newStatus === 'cancelled') {
        const items = await tx.execute(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL',
          [id]
        );
        for (const item of items) {
          await tx.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }
      await tx.execute('UPDATE orders SET status = ? WHERE id = ?', [newStatus, id]);
    });
  }

  return { list, findById, updateStatus };
}

module.exports = { createAdminOrderModel };
