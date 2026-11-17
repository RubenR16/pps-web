'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { allowedNext, canTransition, ALL_STATUSES } = require('../src/services/orderStatus.service');

test('flujo normal y cancelaciones permitidas', () => {
  assert.ok(canTransition('pending', 'paid'));
  assert.ok(canTransition('pending', 'cancelled'));
  assert.ok(canTransition('paid', 'shipped'));
  assert.ok(canTransition('paid', 'cancelled'));
  assert.ok(canTransition('shipped', 'delivered'));
});

test('saltos y retrocesos no permitidos; estados finales sin salida', () => {
  assert.ok(!canTransition('pending', 'delivered'));
  assert.ok(!canTransition('shipped', 'cancelled'));
  assert.ok(!canTransition('shipped', 'pending'));
  assert.deepEqual(allowedNext('delivered'), []);
  assert.deepEqual(allowedNext('cancelled'), []);
  assert.deepEqual(allowedNext('inventado'), []);
});

test('allowedNext devuelve una copia', () => {
  allowedNext('pending').push('hack');
  assert.deepEqual(allowedNext('pending'), ['paid', 'cancelled']);
  assert.equal(ALL_STATUSES.length, 5);
});
