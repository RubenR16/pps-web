'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminOrderModel } = require('../src/models/adminOrder.model');
const { createAdminOrderController } = require('../src/controllers/adminOrder.controller');
const { HttpError } = require('../src/utils/httpError');
const { mockReq, mockRes } = require('./helpers');

function fakeDb(status, items = []) {
  const log = [];
  return {
    log,
    transaction: async (fn) => fn({
      execute: async (sql, params) => {
        log.push({ sql, params });
        if (/SELECT status FROM orders/.test(sql)) return status === null ? [] : [{ status }];
        if (/FROM order_items/.test(sql)) return items;
        return { affectedRows: 1 };
      },
    }),
  };
}

test('cancelar un pedido devuelve el stock y cambia el estado', async () => {
  const db = fakeDb('paid', [{ product_id: 1, quantity: 2 }, { product_id: 4, quantity: 1 }]);
  await createAdminOrderModel(db).updateStatus(8, 'cancelled');
  const restock = db.log.filter((c) => /SET stock = stock \+ \?/.test(c.sql));
  assert.deepEqual(restock.map((c) => c.params), [[2, 1], [1, 4]]);
  assert.deepEqual(db.log.at(-1).params, ['cancelled', 8]);
});

test('una transición normal no toca el stock', async () => {
  const db = fakeDb('paid');
  await createAdminOrderModel(db).updateStatus(8, 'shipped');
  assert.ok(!db.log.some((c) => /products/.test(c.sql)));
});

test('transición no permitida -> 409 y sin cambios', async () => {
  const db = fakeDb('delivered');
  await assert.rejects(createAdminOrderModel(db).updateStatus(8, 'cancelled'), (e) => e instanceof HttpError && e.status === 409);
  assert.ok(!db.log.some((c) => /UPDATE orders/.test(c.sql)));
});

test('pedido inexistente -> 404; el pedido se bloquea con FOR UPDATE', async () => {
  await assert.rejects(createAdminOrderModel(fakeDb(null)).updateStatus(8, 'paid'), (e) => e.status === 404);
  const db = fakeDb('pending');
  await createAdminOrderModel(db).updateStatus(8, 'paid');
  assert.match(db.log[0].sql, /FOR UPDATE/);
});

test('listado: el filtro de estado va como parámetro', async () => {
  const calls = [];
  const db = { execute: async (sql, params) => { calls.push({ sql, params }); return /COUNT/.test(sql) ? [{ total: 0 }] : []; } };
  await createAdminOrderModel(db).list({ status: 'paid', limit: 10, offset: 0 });
  assert.deepEqual(calls[0].params, ['paid']);
  assert.match(calls[1].sql, /LIMIT 10 OFFSET 0$/);
});

test('detalle: incluye cliente, totales y estados siguientes permitidos', async () => {
  const db = {
    execute: async (sql) => (/FROM orders o/.test(sql)
      ? [{ id: 8, status: 'paid', total: 84.99, username: 'alice', email: 'a@x.com' }]
      : [{ product_id: 1, product_name: 'T', unit_price: 40, quantity: 2 }]),
  };
  const order = await createAdminOrderModel(db).findById(8);
  assert.equal(order.subtotal, 80);
  assert.equal(order.shipping_cost, 4.99);
  assert.deepEqual(order.allowed_statuses, ['shipped', 'cancelled']);
});

test('controlador: estado inválido -> 400; conflicto -> 409; éxito -> 200', async () => {
  const model = {
    updateStatus: async (id, s) => { if (s === 'cancelled') throw new HttpError(409, 'No se puede'); },
    findById: async (id) => ({ id }),
  };
  const ctrl = createAdminOrderController({ model });
  const bad = mockRes(); await ctrl.updateStatus(mockReq({ status: 'x' }, { params: { id: '1' } }), bad, assert.ifError);
  const conflict = mockRes(); await ctrl.updateStatus(mockReq({ status: 'cancelled' }, { params: { id: '1' } }), conflict, assert.ifError);
  const ok = mockRes(); await ctrl.updateStatus(mockReq({ status: 'shipped' }, { params: { id: '1' } }), ok, assert.ifError);
  assert.deepEqual([bad.statusCode, conflict.statusCode, ok.statusCode], [400, 409, 200]);
});
