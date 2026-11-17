'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAddItem, validateQuantity } = require('../src/validators/cart.validator');
const { validateCheckout, PAYMENT_METHODS } = require('../src/validators/order.validator');

test('addItem: acepta números y strings numéricos, cantidad por defecto 1', () => {
  assert.deepEqual(validateAddItem({ product_id: 5 }).value, { productId: 5, quantity: 1 });
  assert.deepEqual(validateAddItem({ product_id: '5', quantity: '3' }).value, { productId: 5, quantity: 3 });
});

test('addItem: rechaza ids y cantidades inválidos', () => {
  for (const body of [{}, { product_id: 'x' }, { product_id: -1 }, { product_id: 1.5 }, { product_id: '1abc' }]) {
    assert.ok(validateAddItem(body).errors.product_id, JSON.stringify(body));
  }
  for (const quantity of [0, -2, 11, 1.5, 'abc', null, [1]]) {
    assert.ok(validateAddItem({ product_id: 1, quantity }).errors.quantity, String(quantity));
  }
});

test('addItem: ignora campos como price o total', () => {
  const { value } = validateAddItem({ product_id: 1, quantity: 1, price: 0.01, total: 0 });
  assert.deepEqual(Object.keys(value).sort(), ['productId', 'quantity']);
});

test('validateQuantity', () => {
  assert.equal(validateQuantity({ quantity: 4 }).value.quantity, 4);
  assert.ok(validateQuantity({}).errors.quantity);
  assert.ok(validateQuantity({ quantity: 99 }).errors.quantity);
});

const checkout = {
  shipping_name: 'Alice Martín', shipping_address: 'Calle Falsa 123', shipping_city: 'Valencia',
  shipping_postal_code: '46001', shipping_country: 'España', shipping_phone: '600111222', payment_method: 'card',
};

test('checkout válido', () => {
  const { errors, value } = validateCheckout(checkout);
  assert.deepEqual(errors, {});
  assert.equal(value.payment_method, 'card');
});

test('checkout: campos obligatorios, código postal, teléfono y método de pago', () => {
  const { errors } = validateCheckout({ shipping_postal_code: '<>', shipping_phone: 'abc', payment_method: 'bitcoin' });
  for (const f of ['shipping_name', 'shipping_address', 'shipping_city', 'shipping_postal_code', 'shipping_country', 'shipping_phone', 'payment_method']) {
    assert.ok(errors[f], f);
  }
});

test('checkout: solo devuelve campos permitidos (sin total, precio, estado ni usuario)', () => {
  const { value } = validateCheckout({ ...checkout, total: 0.01, price: 0, status: 'delivered', user_id: 1 });
  assert.ok(!('total' in value) && !('price' in value) && !('status' in value) && !('user_id' in value));
});

test('métodos de pago: la tarjeta simulada queda pagada, el resto pendiente', () => {
  assert.equal(PAYMENT_METHODS.card, 'paid');
  assert.equal(PAYMENT_METHODS.transfer, 'pending');
  assert.equal(PAYMENT_METHODS.cod, 'pending');
  assert.ok(validateCheckout({ ...checkout, payment_method: 'constructor' }).errors.payment_method);
});
