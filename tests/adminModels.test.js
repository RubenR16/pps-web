'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminProductModel } = require('../src/models/adminProduct.model');
const { createAdminUserModel } = require('../src/models/adminUser.model');
const { createCommentModel } = require('../src/models/comment.model');

function fakeDb(rows = [{ total: 0 }]) {
  const calls = [];
  return { calls, execute: async (sql, params) => { calls.push({ sql, params }); return /COUNT\(\*\) AS total/.test(sql) ? [{ total: 3 }] : rows; } };
}

test('productos (admin): incluye inactivos, busca por texto y pagina', async () => {
  const db = fakeDb([]);
  const { total } = await createAdminProductModel(db).list({ search: '100%', limit: 10, offset: 20 });
  assert.equal(total, 3);
  assert.ok(!db.calls[1].sql.includes('is_active = 1'));
  assert.deepEqual(db.calls[1].params, ['%100\\%%', '%100\\%%']);
  assert.match(db.calls[1].sql, /LIMIT 10 OFFSET 20$/);
});

test('productos (admin): update y create usan solo columnas de producto', async () => {
  const db = fakeDb();
  const v = { category_id: 1, name: 'A', description: null, price: 1, stock: 1, is_featured: true, is_active: false };
  await createAdminProductModel(db).create(v);
  await createAdminProductModel(db).update(5, v);
  assert.deepEqual(db.calls[0].params, [1, 'A', null, 1, 1, 1, 0]);
  assert.equal(db.calls[1].params.at(-1), 5);
  assert.ok(!/image|created_at/.test(db.calls[1].sql));
});

test('usuarios (admin): el listado no expone password_hash', async () => {
  const db = fakeDb([]);
  await createAdminUserModel(db).list({ search: 'ali', limit: 15, offset: 0 });
  assert.ok(!db.calls[1].sql.includes('password_hash'));
  assert.equal(db.calls[1].params.length, 3);
});

test('usuarios (admin): updateAccess solo modifica role / is_active', async () => {
  const db = fakeDb();
  await createAdminUserModel(db).updateAccess(4, { role: 'admin', is_active: false });
  assert.match(db.calls[0].sql, /^UPDATE users SET role = \?, is_active = \? WHERE id = \?$/);
  assert.deepEqual(db.calls[0].params, ['admin', 0, 4]);
  await createAdminUserModel(db).updateAccess(4, {});
  assert.equal(db.calls.length, 1); // sin cambios: no se ejecuta nada
});

test('comentarios: listado por producto con límite acotado', async () => {
  const db = fakeDb([]);
  await createCommentModel(db).listByProduct(9, 100000);
  assert.deepEqual(db.calls[0].params, [9]);
  assert.match(db.calls[0].sql, /LIMIT 100$/);
});
