'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeTotals } = require('../src/services/pricing.service');
const { buildCartView } = require('../src/services/cart.service');

test('importes: suma exacta en céntimos (sin errores de coma flotante)', () => {
  const t = computeTotals([{ price: 0.1, quantity: 3 }, { price: 0.2, quantity: 1 }]);
  assert.equal(t.subtotal, 0.5);
});

test('envío: 4,99 € bajo 100 € y gratis a partir de 100 €', () => {
  const low = computeTotals([{ price: 49.9, quantity: 1 }]);
  assert.equal(low.shipping, 4.99);
  assert.equal(low.total, 54.89);
  assert.equal(low.missing_for_free_shipping, 50.1);

  const high = computeTotals([{ price: 50, quantity: 2 }]);
  assert.equal(high.shipping, 0);
  assert.equal(high.total, 100);
  assert.equal(high.missing_for_free_shipping, 0);
});

test('carrito vacío: sin envío ni total', () => {
  assert.deepEqual(computeTotals([]), { subtotal: 0, shipping: 0, total: 0, missing_for_free_shipping: 0 });
});

const row = (over) => ({
  product_id: 1, quantity: 2, name: 'Teclado', price: 79.9, stock: 10, image: null, is_active: 1, category_slug: 'perifericos', ...over,
});

test('vista del carrito: líneas, totales y permiso para pagar', () => {
  const view = buildCartView([row({}), row({ product_id: 2, quantity: 1, price: 10 })]);
  assert.equal(view.item_count, 3);
  assert.equal(view.items[0].line_total, 159.8);
  assert.equal(view.totals.subtotal, 169.8);
  assert.equal(view.can_checkout, true);
});

test('vista del carrito: avisos de stock, agotado y producto retirado', () => {
  assert.match(buildCartView([row({ quantity: 5, stock: 3 })]).items[0].issue, /Solo quedan 3/);
  assert.match(buildCartView([row({ stock: 0 })]).items[0].issue, /agotado/i);
  assert.match(buildCartView([row({ is_active: 0 })]).items[0].issue, /no está disponible/);
  assert.equal(buildCartView([row({ stock: 0 })]).can_checkout, false);
  assert.equal(buildCartView([]).can_checkout, false);
});
