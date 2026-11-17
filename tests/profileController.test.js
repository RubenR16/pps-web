'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProfileController } = require('../src/controllers/profile.controller');
const { mockReq, mockRes, fakePasswordService } = require('./helpers');

function setup({ takenEmail = false, hash = 'hash:vieja123' } = {}) {
  const calls = { updateProfile: null, updatePassword: null, updateEmail: null };
  const userModel = {
    findTaken: async () => ({ username: false, email: takenEmail }),
    updateProfile: async (id, data) => { calls.updateProfile = { id, data }; },
    updateEmail: async (id, email) => { calls.updateEmail = { id, email }; },
    findById: async (id) => ({ id, username: 'alice', role: 'user' }),
    getPasswordHash: async () => hash,
    updatePassword: async (id, h) => { calls.updatePassword = { id, h }; },
  };
  return { calls, ctrl: createProfileController({ userModel, passwordService: fakePasswordService() }) };
}

const user = { id: 7, username: 'alice', role: 'user' };

test('actualiza el perfil del usuario con sesión', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.update(mockReq({ email: 'a@b.com', full_name: 'Ana', city: 'Valencia' }, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.updateProfile.id, 7);
  assert.equal(calls.updateProfile.data.city, 'Valencia');
});

test('email ya usado por otro usuario -> 409', async () => {
  const { ctrl } = setup({ takenEmail: true });
  const res = mockRes();
  await ctrl.update(mockReq({ email: 'a@b.com' }, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 409);
});

test('datos inválidos -> 400', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.update(mockReq({ email: 'mal' }, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
});

test('cambio rápido de email', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.changeEmail(mockReq({}, { user, query: { email: 'Nuevo@X.com' } }), res, assert.ifError);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.updateEmail, { id: 7, email: 'nuevo@x.com' });

  const bad = mockRes();
  await ctrl.changeEmail(mockReq({}, { user, query: { email: 'mal' } }), bad, assert.ifError);
  assert.equal(bad.statusCode, 400);
});

test('cambio de contraseña correcto: guarda el hash nuevo', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.changePassword(mockReq({ current_password: 'vieja123', new_password: 'nueva123' }, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.updatePassword, { id: 7, h: 'hash:nueva123' });
});

test('cambio de contraseña con la actual incorrecta -> 400 y no guarda nada', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.changePassword(mockReq({ current_password: 'equivocada', new_password: 'nueva123' }, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.fields.current_password);
  assert.equal(calls.updatePassword, null);
});

test('la nueva contraseña debe tener la longitud mínima', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.changePassword(mockReq({ current_password: 'vieja123', new_password: 'ab' }, { user }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.fields.new_password);
});
