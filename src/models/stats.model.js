'use strict';

function createStatsModel(db) {
  async function overview() {
    const [users] = await db.execute('SELECT COUNT(*) AS n FROM users');
    const [products] = await db.execute('SELECT COUNT(*) AS n FROM products WHERE is_active = 1');
    const [lowStock] = await db.execute('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock <= 5');
    const [orders] = await db.execute('SELECT COUNT(*) AS n FROM orders');
    const [pending] = await db.execute("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'");
    const [revenue] = await db.execute("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status IN ('paid', 'shipped', 'delivered')");
    const recent = await db.execute(
      `SELECT o.id, o.status, o.total, o.created_at, u.username
         FROM orders o JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC, o.id DESC LIMIT 5`
    );
    return {
      users: Number(users.n),
      products: Number(products.n),
      low_stock: Number(lowStock.n),
      orders: Number(orders.n),
      pending_orders: Number(pending.n),
      revenue: Number(revenue.n),
      recent_orders: recent,
    };
  }
  return { overview };
}

module.exports = { createStatsModel };
