'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseProductQuery, parseId } = require('../src/validators/product.validator');

test('valores por defecto', () => {
  assert.deepEqual(parseProductQuery({}), {
    search: '', category: '', sort: 'newest', featured: false, excludeId: null, page: 1, limit: 12,
  });
});

test('normaliza búsqueda, categoría y featured', () => {
  const q = parseProductQuery({ search: '  teclado  ', category: 'redes', featured: '1' });
  assert.equal(q.search, 'teclado');
  assert.equal(q.category, 'redes');
  assert.equal(q.featured, true);
});

test('ordenación fuera de la lista blanca vuelve a "newest"', () => {
  assert.equal(parseProductQuery({ sort: 'price_asc' }).sort, 'price_asc');
  assert.equal(parseProductQuery({ sort: 'name; DROP TABLE users' }).sort, 'newest');
});

test('page y limit se validan y acotan', () => {
  assert.equal(parseProductQuery({ page: '0' }).page, 1);
  assert.equal(parseProductQuery({ page: '-3' }).page, 1);
  assert.equal(parseProductQuery({ page: 'abc' }).page, 1);
  assert.equal(parseProductQuery({ page: '3' }).page, 3);
  assert.equal(parseProductQuery({ limit: '1000' }).limit, 48);
  assert.equal(parseProductQuery({ limit: '0' }).limit, 1);
  assert.equal(parseProductQuery({ limit: '1; --' }).limit, 12);
});

test('ignora parámetros repetidos (arrays) u objetos', () => {
  const q = parseProductQuery({ search: ['a', 'b'], category: { $ne: 1 }, sort: ['name'] });
  assert.equal(q.search, '');
  assert.equal(q.category, '');
  assert.equal(q.sort, 'newest');
});

test('quita espacios de la búsqueda', () => {
  assert.equal(parseProductQuery({ search: '  teclado  ' }).search, 'teclado');
});

test('parseId', () => {
  assert.equal(parseId('7'), 7);
  assert.equal(parseId('0'), null);
  assert.equal(parseId('-1'), null);
  assert.equal(parseId('1abc'), null);
  assert.equal(parseId('1.5'), null);
  assert.equal(parseId(undefined), null);
  assert.equal(parseId('1234567890'), null);
});
