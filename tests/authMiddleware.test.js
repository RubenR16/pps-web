'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { attachUser, requireAuth, requireRole } = require('../src/middleware/auth');
const { mockRes } = require('./helpers');

test('attachUser: sin sesión -> req.user null', async () => {
  const req = { session: {} };
  await attachUser({ findById: async () => { throw new Error('no debe llamarse'); } })(req, {}, () => {});
  assert.equal(req.user, null);
});

test('attachUser: carga el usuario activo desde la base de datos', async () => {
  const req = { session: { userId: 3 } };
  await attachUser({ findById: async (id) => ({ id, role: 'admin', is_active: true }) })(req, {}, () => {});
  assert.equal(req.user.id, 3);
  assert.equal(req.user.role, 'admin');
});

test('attachUser: usuario desactivado o borrado -> se invalida la sesión', async () => {
  for (const found of [{ id: 3, is_active: false }, null]) {
    const req = { session: { userId: 3 } };
    await attachUser({ findById: async () => found })(req, {}, () => {});
    assert.equal(req.user, null);
    assert.equal(req.session.userId, undefined);
  }
});

test('attachUser: errores de base de datos van a next', async () => {
  const boom = new Error('db');
  let got;
  await attachUser({ findById: async () => { throw boom; } })({ session: { userId: 1 } }, {}, (e) => { got = e; });
  assert.equal(got, boom);
});

test('requireAuth', () => {
  const res = mockRes();
  let passed = false;
  requireAuth({ user: null }, res, () => { passed = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(passed, false);
  requireAuth({ user: { id: 1 } }, mockRes(), () => { passed = true; });
  assert.equal(passed, true);
});

test('requireRole: 401 sin sesión, 403 con rol insuficiente, paso con rol correcto', () => {
  const guard = requireRole('admin');
  const r1 = mockRes(); guard({ user: null }, r1, () => {});
  const r2 = mockRes(); guard({ user: { role: 'user' } }, r2, () => {});
  let passed = false;
  guard({ user: { role: 'admin' } }, mockRes(), () => { passed = true; });
  assert.equal(r1.statusCode, 401);
  assert.equal(r2.statusCode, 403);
  assert.equal(passed, true);
});
