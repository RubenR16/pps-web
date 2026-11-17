'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCartController } = require('../src/controllers/cart.controller');
const { mockReq, mockRes } = require('./helpers');

function setup({ product = { id: 1, stock: 5, price: 10 }, items = {} } = {}) {
  const store = { ...items }; // productId -> quantity
  const cartModel = {
    getQuantity: async (u, p) => store[p] || 0,
    setQuantity: async (u, p, q) => { store[p] = q; },
    removeItem: async (u, p) => { delete store[p]; },
    clear: async () => { for (const k of Object.keys(store)) delete store[k]; },
    countItems: async () => Object.values(store).reduce((a, b) => a + b, 0),
    listItems: async () => Object.entries(store).map(([pid, quantity]) => ({
      product_id: Number(pid), quantity, name: 'P', price: 10, stock: 5, image: null, is_active: 1, category_slug: null,
    })),
  };
  const productModel = { findById: async (id) => (product && id === product.id ? product : null) };
  return { store, ctrl: createCartController({ cartModel, productModel }) };
}
const user = { id: 7 };
const req = (body, extra) => mockReq(body, { user, ...extra });

test('añadir: crea la línea y suma si ya existe', async () => {
  const { ctrl, store } = setup();
  await ctrl.addItem(req({ product_id: 1, quantity: 2 }), mockRes(), assert.ifError);
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 1, quantity: 1 }), res, assert.ifError);
  assert.equal(store[1], 3);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.item_count, 3);
});

test('añadir: la vista del carrito muestra el precio del producto', async () => {
  const { ctrl, store } = setup();
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 1, quantity: 1 }), res, assert.ifError);
  assert.equal(store[1], 1);
  assert.equal(res.body.items[0].price, 10);
});

test('añadir: producto inexistente -> 404', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 99 }), res, assert.ifError);
  assert.equal(res.statusCode, 404);
});

test('añadir: más unidades que el stock -> 409', async () => {
  const { ctrl, store } = setup({ items: { 1: 4 } });
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 1, quantity: 2 }), res, assert.ifError);
  assert.equal(res.statusCode, 409);
  assert.equal(store[1], 4);
});

test('añadir: producto agotado -> 409', async () => {
  const { ctrl } = setup({ product: { id: 1, stock: 0 } });
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 1 }), res, assert.ifError);
  assert.equal(res.statusCode, 409);
});

test('añadir: máximo 10 unidades por producto -> 400', async () => {
  const { ctrl } = setup({ product: { id: 1, stock: 50 }, items: { 1: 8 } });
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 1, quantity: 3 }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
});

test('añadir: datos inválidos -> 400', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.addItem(req({ product_id: 'x' }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
});

test('actualizar cantidad', async () => {
  const { ctrl, store } = setup({ items: { 1: 1 } });
  const res = mockRes();
  await ctrl.updateItem(req({ quantity: 4 }, { params: { productId: '1' } }), res, assert.ifError);
  assert.equal(store[1], 4);
  assert.equal(res.statusCode, 200);
});

test('actualizar: producto que no está en el carrito -> 404; cantidad inválida -> 400', async () => {
  const { ctrl } = setup();
  const r1 = mockRes();
  await ctrl.updateItem(req({ quantity: 1 }, { params: { productId: '1' } }), r1, assert.ifError);
  assert.equal(r1.statusCode, 404);
  const r2 = mockRes();
  await ctrl.updateItem(req({ quantity: 0 }, { params: { productId: '1' } }), r2, assert.ifError);
  assert.equal(r2.statusCode, 400);
});

test('quitar, vaciar y resumen', async () => {
  const { ctrl, store } = setup({ items: { 1: 2, 2: 1 } });
  await ctrl.removeItem(req({}, { params: { productId: '1' } }), mockRes(), assert.ifError);
  assert.deepEqual(Object.keys(store), ['2']);
  const summary = mockRes();
  await ctrl.summary(req({}), summary, assert.ifError);
  assert.equal(summary.body.item_count, 1);
  await ctrl.clear(req({}), mockRes(), assert.ifError);
  assert.deepEqual(store, {});
});

test('id de producto inválido en la ruta -> 400', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.removeItem(req({}, { params: { productId: 'abc' } }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
});
