'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, paged, parseSearch } = require('../src/utils/pagination');

test('valores por defecto y cálculo de offset', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(parsePagination({ page: '3', limit: '10' }), { page: 3, limit: 10, offset: 20 });
});

test('valores inválidos caen en los límites', () => {
  assert.equal(parsePagination({ page: '-1' }).page, 1);
  assert.equal(parsePagination({ page: '1; DROP' }).page, 1);
  assert.equal(parsePagination({ limit: '100000' }).limit, 100);
  assert.equal(parsePagination({ limit: ['5'] }).limit, 20);
});

test('paged y parseSearch', () => {
  assert.deepEqual(paged([1], 25, { page: 2, limit: 10 }), { items: [1], total: 25, page: 2, limit: 10, pages: 3 });
  assert.equal(paged([], 0, { page: 1, limit: 10 }).pages, 1);
  assert.equal(parseSearch({ search: '  hola ' }), 'hola');
  assert.equal(parseSearch({ search: ['a'] }), '');
  assert.equal(parseSearch({ search: 'x'.repeat(300) }).length, 100);
});
