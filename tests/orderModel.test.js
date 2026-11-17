'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrderModel } = require('../src/models/order.model');
const { HttpError } = require('../src/utils/httpError');

const shipping = {
  shipping_name: 'Alice', shipping_address: 'Calle 1', shipping_city: 'Valencia',
  shipping_postal_code: '46001', shipping_country: 'España', shipping_phone: null, payment_method: 'card',
};

/** db simulada con transacción: registra las sentencias y responde con los productos indicados. */
function fakeDb(products = {}) {
  const log = [];
  const db = {
    log,
    transaction: async (fn) => fn({
      execute: async (sql, params) => {
        log.push({ sql, params });
        if (/FROM products/.test(sql)) return products[params[0]] ? [products[params[0]]] : [];
        if (/^\s*INSERT INTO orders/.test(sql)) return { insertId: 55 };
        return { affectedRows: 1 };
      },
    }),
    execute: async (sql, params) => { log.push({ sql, params }); return []; },
  };
  return db;
}

const product = (over) => ({ id: 1, name: 'Teclado', stock: 10, is_active: 1, ...over });
const catalog = { 1: product({}), 2: product({ id: 2, name: 'Ratón' }) };

test('checkout: crea pedido, líneas, descuenta stock y vacía el carrito', async () => {
  const db = fakeDb(catalog);
  const items = [{ productId: 1, quantity: 2, price: 40 }, { productId: 2, quantity: 1, price: 10 }];
  const id = await createOrderModel(db).create(7, items, shipping, 'paid');
  assert.equal(id, 55);

  const order = db.log.find((c) => /INSERT INTO orders/.test(c.sql));
  assert.equal(order.params[0], 7);
  assert.equal(order.params[1], 'paid');
  assert.equal(order.params[2], 94.99); // subtotal 90 + 4,99 de envío (< 100 €)
  assert.ok(db.log.some((c) => /DELETE FROM cart_items/.test(c.sql)));
});

test('checkout: envío gratis a partir de 100 €', async () => {
  const db = fakeDb(catalog);
  await createOrderModel(db).create(7, [{ productId: 1, quantity: 3, price: 40 }], shipping, 'pending');
  const order = db.log.find((c) => /INSERT INTO orders/.test(c.sql));
  assert.equal(order.params[2], 120);
});

test('checkout: guarda nombre y precio de cada línea y descuenta stock', async () => {
  const db = fakeDb(catalog);
  await createOrderModel(db).create(7, [{ productId: 1, quantity: 2, price: 40 }], shipping, 'paid');
  const item = db.log.find((c) => /INSERT INTO order_items/.test(c.sql));
  assert.deepEqual(item.params, [55, 1, 'Teclado', 40, 2]);
  const stock = db.log.find((c) => /UPDATE products/.test(c.sql));
  assert.deepEqual(stock.params, [2, 1]);
});

test('checkout: producto inexistente -> 404', async () => {
  await assert.rejects(createOrderModel(fakeDb({})).create(7, [{ productId: 9, quantity: 1, price: 1 }], shipping, 'paid'),
    (e) => e instanceof HttpError && e.status === 404);
});

test('checkout: stock insuficiente -> HttpError 409 sin crear el pedido', async () => {
  const db = fakeDb({ 1: product({ stock: 2 }) });
  await assert.rejects(createOrderModel(db).create(7, [{ productId: 1, quantity: 5, price: 40 }], shipping, 'paid'),
    (e) => e instanceof HttpError && e.status === 409 && /quedan 2/.test(e.message));
  assert.ok(!db.log.some((c) => /INSERT INTO orders/.test(c.sql)));
});

test('checkout: producto retirado -> 409', async () => {
  await assert.rejects(createOrderModel(fakeDb({ 1: product({ is_active: 0 }) })).create(7, [{ productId: 1, quantity: 1, price: 40 }], shipping, 'paid'),
    (e) => e.status === 409);
});

test('findById calcula subtotal, envío y total de cada línea', async () => {
  const db = {
    execute: async (sql) => {
      if (/FROM orders/.test(sql)) return [{ id: 9, user_id: 7, total: 84.99, status: 'paid' }];
      return [{ product_id: 1, product_name: 'Teclado', unit_price: 40, quantity: 2 }];
    },
  };
  const order = await createOrderModel(db).findById(9);
  assert.equal(order.subtotal, 80);
  assert.equal(order.shipping_cost, 4.99);
  assert.equal(order.items[0].line_total, 80);
});

test('findById devuelve null si el pedido no existe', async () => {
  const db = { execute: async () => [] };
  assert.equal(await createOrderModel(db).findById(9), null);
});

test('listByUser convierte item_count a número', async () => {
  const db = { execute: async () => [{ id: 1, item_count: '3' }] };
  assert.equal((await createOrderModel(db).listByUser(7))[0].item_count, 3);
});
