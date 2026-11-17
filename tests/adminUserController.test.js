'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminUserController } = require('../src/controllers/adminUser.controller');
const { mockReq, mockRes } = require('./helpers');

function setup() {
  const calls = { update: null };
  const users = { 1: { id: 1, role: 'admin', is_active: true }, 2: { id: 2, role: 'user', is_active: true } };
  const ctrl = createAdminUserController({
    model: { list: async () => ({ items: [], total: 0 }), updateAccess: async (id, v) => { calls.update = { id, v }; } },
    userModel: { findById: async (id) => users[id] || null },
  });
  return { ctrl, calls };
}
const admin = { id: 1, role: 'admin' };

test('cambiar rol de otro usuario: solo se pasan role/is_active al modelo', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.update(mockReq({ role: 'admin', email: 'x@y.z', password_hash: 'h', id: 99 }, { user: admin, params: { id: '2' } }), res, assert.ifError);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.update, { id: 2, v: { role: 'admin' } });
});

test('un administrador no puede quitarse el rol ni desactivarse a sí mismo', async () => {
  const { ctrl, calls } = setup();
  for (const body of [{ role: 'user' }, { is_active: false }]) {
    const res = mockRes();
    await ctrl.update(mockReq(body, { user: admin, params: { id: '1' } }), res, assert.ifError);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(calls.update, null);
});

test('usuario inexistente -> 404; id inválido -> 400; sin cambios -> 400', async () => {
  const { ctrl } = setup();
  const r1 = mockRes(); await ctrl.update(mockReq({ role: 'user' }, { user: admin, params: { id: '9' } }), r1, assert.ifError);
  const r2 = mockRes(); await ctrl.update(mockReq({ role: 'user' }, { user: admin, params: { id: 'x' } }), r2, assert.ifError);
  const r3 = mockRes(); await ctrl.update(mockReq({}, { user: admin, params: { id: '2' } }), r3, assert.ifError);
  assert.deepEqual([r1.statusCode, r2.statusCode, r3.statusCode], [404, 400, 400]);
});
