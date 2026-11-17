'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCartModel } = require('../src/models/cart.model');

function fakeDb(rows = []) {
  const calls = [];
  return { calls, execute: async (sql, params) => { calls.push({ sql, params }); return rows; } };
}

test('getOrCreateCartId crea el carrito si no existe y devuelve su id', async () => {
  const db = fakeDb([{ id: 3 }]);
  assert.equal(await createCartModel(db).getOrCreateCartId(7), 3);
  assert.match(db.calls[0].sql, /INSERT IGNORE INTO carts/);
});

test('listItems siempre filtra por usuario y usa parámetros', async () => {
  const db = fakeDb([]);
  await createCartModel(db).listItems(7);
  assert.match(db.calls[0].sql, /WHERE c\.user_id = \?/);
  assert.deepEqual(db.calls[0].params, [7]);
});

test('getQuantity devuelve 0 si la línea no existe', async () => {
  assert.equal(await createCartModel(fakeDb([])).getQuantity(7, 1), 0);
  assert.equal(await createCartModel(fakeDb([{ quantity: 4 }])).getQuantity(7, 1), 4);
});

test('setQuantity hace upsert sobre el carrito del usuario', async () => {
  const db = fakeDb([{ id: 3 }]);
  await createCartModel(db).setQuantity(7, 1, 2);
  const upsert = db.calls.at(-1);
  assert.match(upsert.sql, /ON DUPLICATE KEY UPDATE quantity/);
  assert.deepEqual(upsert.params, [3, 1, 2]);
});

test('removeItem y clear solo afectan al carrito del usuario', async () => {
  const db = fakeDb([]);
  await createCartModel(db).removeItem(7, 1);
  await createCartModel(db).clear(7);
  assert.match(db.calls[0].sql, /SELECT id FROM carts WHERE user_id = \?/);
  assert.deepEqual(db.calls[0].params, [1, 7]);
  assert.deepEqual(db.calls[1].params, [7]);
});

test('countItems devuelve número', async () => {
  assert.equal(await createCartModel(fakeDb([{ item_count: '5' }])).countItems(7), 5);
});
