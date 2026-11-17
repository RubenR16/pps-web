'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validators/admin.validator');

const product = { name: 'Teclado X', description: 'Bueno', price: '79,90', stock: '12', category_id: '2', is_featured: true, is_active: true };

test('producto válido: normaliza precio con coma y tipos', () => {
  const { errors, value } = v.validateProduct(product);
  assert.deepEqual(errors, {});
  assert.equal(value.price, 79.9);
  assert.equal(value.stock, 12);
  assert.equal(value.category_id, 2);
});

test('producto: errores por campo', () => {
  const { errors } = v.validateProduct({ name: 'a', price: '-5', stock: '-1', category_id: 'x', is_active: 'quizás' });
  for (const f of ['name', 'price', 'stock', 'category_id', 'is_active']) assert.ok(errors[f], f);
});

test('producto: precio fuera de rango o con demasiados decimales', () => {
  for (const price of ['0', '0.001', '100000', 'abc', '1e3', '']) assert.equal(v.parsePrice(price), null, price);
  assert.equal(v.parsePrice(12.5), 12.5);
});

test('producto: categoría vacía = sin categoría; booleanos por defecto', () => {
  const { value } = v.validateProduct({ ...product, category_id: '', is_featured: undefined, is_active: undefined });
  assert.equal(value.category_id, null);
  assert.equal(value.is_featured, false);
  assert.equal(value.is_active, true);
});

test('producto: solo devuelve campos permitidos', () => {
  const { value } = v.validateProduct({ ...product, id: 9, image: '/x.php', created_at: 'ayer' });
  assert.deepEqual(Object.keys(value).sort(), ['category_id', 'description', 'is_active', 'is_featured', 'name', 'price', 'stock']);
});

test('usuario: solo role e is_active', () => {
  assert.deepEqual(v.validateUserUpdate({ role: 'admin', password_hash: 'x', email: 'a@b.c' }).value, { role: 'admin' });
  assert.deepEqual(v.validateUserUpdate({ is_active: false }).value, { is_active: false });
  assert.ok(v.validateUserUpdate({ role: 'superadmin' }).errors.role);
  assert.ok(v.validateUserUpdate({}).errors.role);
  assert.ok(v.validateUserUpdate({ is_active: 'tal vez' }).errors.is_active);
});

test('estado de pedido y filtro', () => {
  assert.equal(v.validateOrderStatus({ status: 'shipped' }).errors.status, undefined);
  assert.ok(v.validateOrderStatus({ status: 'roto' }).errors.status);
  assert.equal(v.parseStatusFilter({ status: 'paid' }), 'paid');
  assert.equal(v.parseStatusFilter({ status: 'pagado' }), '');
});
