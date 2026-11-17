'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrderController } = require('../src/controllers/order.controller');
const { HttpError } = require('../src/utils/httpError');
const { mockReq, mockRes } = require('./helpers');

const body = {
  shipping_name: 'Alice', shipping_address: 'Calle 1', shipping_city: 'Valencia',
  shipping_postal_code: '46001', shipping_country: 'España', payment_method: 'card',
  items: [{ product_id: 3, quantity: 2, price: 19.9 }],
};
const user = { id: 7 };

function setup(over = {}) {
  const calls = {};
  const orderModel = {
    create: async (...args) => { calls.create = args; return 12; },
    findById: async (id) => { calls.find = id; return id === 12 ? { id, user_id: 7 } : null; },
    listByUser: async (uid) => { calls.list = uid; return [{ id: 12 }]; },
    ...over,
  };
  return { calls, ctrl: createOrderController({ orderModel }) };
}

test('crear pedido: usa el usuario de la sesión, los artículos y el estado según el pago', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.create(mockReq(body, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 201);
  const [userId, items, shipping, status] = calls.create;
  assert.equal(userId, 7);
  assert.deepEqual(items, [{ productId: 3, quantity: 2, price: 19.9 }]);
  assert.equal(shipping.shipping_city, 'Valencia');
  assert.equal(status, 'paid');
  assert.equal(res.body.order.id, 12);
});

test('crear pedido: transferencia queda pendiente', async () => {
  const { ctrl, calls } = setup();
  await ctrl.create(mockReq({ ...body, payment_method: 'transfer' }, { user }), mockRes(), assert.ifError);
  assert.equal(calls.create[3], 'pending');
});

test('crear pedido: datos inválidos o sin artículos -> 400 y no se llama al modelo', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.create(mockReq({}, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.fields.shipping_name && res.body.fields.items);
  assert.equal(calls.create, undefined);

  const noItems = mockRes();
  await ctrl.create(mockReq({ ...body, items: [] }, { user }), noItems, assert.ifError);
  assert.equal(noItems.statusCode, 400);
});

test('crear pedido: los errores de negocio (stock) se devuelven con su código', async () => {
  const { ctrl } = setup({ create: async () => { throw new HttpError(409, 'No hay stock suficiente de "X" (quedan 1).'); } });
  const res = mockRes();
  await ctrl.create(mockReq(body, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /stock/);
});

test('crear pedido: errores inesperados van a next', async () => {
  const boom = new Error('db');
  const { ctrl } = setup({ create: async () => { throw boom; } });
  let got;
  await ctrl.create(mockReq(body, { user }), mockRes(), (e) => { got = e; });
  assert.equal(got, boom);
});

test('detalle: devuelve el pedido; inexistente -> 404; id inválido -> 400', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.getOne(mockReq({}, { user, params: { id: '12' } }), res, assert.ifError);
  assert.equal(calls.find, 12);
  assert.equal(res.statusCode, 200);

  const missing = mockRes();
  await ctrl.getOne(mockReq({}, { user, params: { id: '13' } }), missing, assert.ifError);
  assert.equal(missing.statusCode, 404);

  const bad = mockRes();
  await ctrl.getOne(mockReq({}, { user, params: { id: 'abc' } }), bad, assert.ifError);
  assert.equal(bad.statusCode, 400);
});

test('historial: pedidos del usuario con sesión', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.list(mockReq({}, { user }), res, assert.ifError);
  assert.equal(calls.list, 7);
  assert.deepEqual(res.body, { items: [{ id: 12 }] });
});
