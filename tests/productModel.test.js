'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProductModel } = require('../src/models/product.model');

function fakeDb({ total = 30, rows = [] } = {}) {
  const calls = [];
  const respond = (sql) => (sql.includes('COUNT(*)') ? [{ total }] : rows);
  return {
    calls,
    async query(sql) { calls.push({ sql }); return respond(sql); },
    async execute(sql, params) { calls.push({ sql, params }); return respond(sql); },
  };
}

test('list: sin filtros solo muestra productos activos y calcula páginas', async () => {
  const db = fakeDb();
  const result = await createProductModel(db).list({ sort: 'newest', page: 1, limit: 12 });
  assert.match(db.calls[0].sql, /WHERE p\.is_active = 1$/);
  assert.equal(result.total, 30);
  assert.equal(result.pages, 3);
});

test('list: filtra por búsqueda y categoría', async () => {
  const db = fakeDb();
  await createProductModel(db).list({ search: 'teclado', category: 'perifericos', sort: 'newest', page: 1, limit: 12 });
  assert.match(db.calls[1].sql, /p\.name LIKE/);
  assert.match(db.calls[1].sql, /c\.slug =/);
});

test('list: paginación calcula LIMIT/OFFSET', async () => {
  const db = fakeDb();
  await createProductModel(db).list({ sort: 'price_asc', page: 2, limit: 12 });
  assert.match(db.calls[1].sql, /ORDER BY p\.price ASC, p\.id ASC LIMIT 12 OFFSET 12$/);
});

test('list: ordenación desconocida cae en "newest" y LIMIT queda acotado', async () => {
  const db = fakeDb();
  await createProductModel(db).list({ sort: 'otra', page: 1, limit: 9999 });
  assert.match(db.calls[1].sql, /ORDER BY p\.created_at DESC/);
  assert.match(db.calls[1].sql, /LIMIT 48 OFFSET 0$/);
});

test('list: featured y exclude', async () => {
  const db = fakeDb();
  await createProductModel(db).list({ featured: true, excludeId: 5, sort: 'name', page: 1, limit: 4 });
  assert.match(db.calls[0].sql, /p\.is_featured = 1/);
  assert.match(db.calls[0].sql, /p\.id <> 5/);
});

test('list: convierte is_featured a booleano', async () => {
  const db = fakeDb({ total: 1, rows: [{ id: 1, is_featured: 1 }] });
  const { items } = await createProductModel(db).list({ sort: 'newest', page: 1, limit: 12 });
  assert.equal(items[0].is_featured, true);
});

test('findById devuelve null si no existe', async () => {
  const model = createProductModel({ execute: async () => [] });
  assert.equal(await model.findById(99), null);
});

test('findById devuelve el producto', async () => {
  const db = fakeDb({ rows: [{ id: 3, is_featured: 0 }] });
  const p = await createProductModel(db).findById(3);
  assert.deepEqual(db.calls[0].params, [3]);
  assert.equal(p.id, 3);
});
