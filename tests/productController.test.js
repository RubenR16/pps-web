'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProductController } = require('../src/controllers/product.controller');

function mockRes() {
  return {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

test('list pasa filtros validados al modelo', async () => {
  let received;
  const ctrl = createProductController({ list: async (f) => { received = f; return { items: [], total: 0 }; } });
  const res = mockRes();
  await ctrl.list({ query: { search: 'ssd', sort: 'bad', page: 'x' } }, res, () => {});
  assert.equal(received.search, 'ssd');
  assert.equal(received.sort, 'newest');
  assert.equal(received.page, 1);
  assert.deepEqual(res.body, { items: [], total: 0 });
});

test('getOne: id inválido -> 400', async () => {
  const ctrl = createProductController({ findById: async () => { throw new Error('no debe llamarse'); } });
  const res = mockRes();
  await ctrl.getOne({ params: { id: 'abc' } }, res, () => {});
  assert.equal(res.statusCode, 400);
});

test('getOne: no existe -> 404', async () => {
  const ctrl = createProductController({ findById: async () => null });
  const res = mockRes();
  await ctrl.getOne({ params: { id: '5' } }, res, () => {});
  assert.equal(res.statusCode, 404);
});

test('getOne: existe -> 200', async () => {
  const ctrl = createProductController({ findById: async (id) => ({ id }) });
  const res = mockRes();
  await ctrl.getOne({ params: { id: '5' } }, res, () => {});
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { id: 5 });
});

test('los errores del modelo se delegan en next', async () => {
  const boom = new Error('db caída');
  const ctrl = createProductController({ list: async () => { throw boom; }, findById: async () => { throw boom; } });
  let got1, got2;
  await ctrl.list({ query: {} }, mockRes(), (e) => { got1 = e; });
  await ctrl.getOne({ params: { id: '1' } }, mockRes(), (e) => { got2 = e; });
  assert.equal(got1, boom);
  assert.equal(got2, boom);
});
