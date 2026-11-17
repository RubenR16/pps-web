'use strict';

const { computeTotals, toCents } = require('./pricing.service');

function issueFor(row) {
  if (!row.is_active) return 'Este producto ya no está disponible.';
  if (row.stock <= 0) return 'Producto agotado.';
  if (row.quantity > row.stock) return `Solo quedan ${row.stock} unidades.`;
  return null;
}

/** Convierte las filas del carrito en la vista que consume el frontend (con importes y avisos). */
function buildCartView(rows) {
  const items = rows.map((r) => ({
    id: r.product_id,
    product_id: r.product_id,
    name: r.name,
    image: r.image || null,
    category_slug: r.category_slug || null,
    price: Number(r.price),
    quantity: r.quantity,
    stock: r.stock,
    line_total: (toCents(r.price) * r.quantity) / 100,
    issue: issueFor(r),
  }));

  return {
    items,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    totals: computeTotals(items),
    can_checkout: items.length > 0 && items.every((i) => !i.issue),
  };
}

module.exports = { buildCartView, issueFor };
