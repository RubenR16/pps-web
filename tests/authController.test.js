'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthController } = require('../src/controllers/auth.controller');
const { mockReq, mockRes, fakePasswordService } = require('./helpers');

function setup({ users = [] } = {}) {
  const store = users.map((u) => ({ ...u }));
  const created = [];
  const userModel = {
    findTaken: async ({ username, email }) => ({
      username: store.some((u) => u.username === username),
      email: store.some((u) => u.email === email),
    }),
    create: async (data) => { created.push(data); const id = 100 + created.length; store.push({ id, username: data.username, email: data.email, password_hash: data.passwordHash, role: data.role || 'user', is_active: true }); return id; },
    findById: async (id) => { const u = store.find((x) => x.id === id); return u ? { id: u.id, username: u.username, role: u.role } : null; },
    findAuthByIdentifier: async (ident) => store.find((u) => u.username === ident || u.email === ident) || null,
  };
  const passwordService = fakePasswordService();
  const ctrl = createAuthController({ userModel, passwordService });
  return { ctrl, created, store };
}

const alice = { id: 1, username: 'alice', email: 'alice@x.com', password_hash: 'hash:alice123', role: 'user', is_active: true };

test('registro correcto: 201, guarda el hash y abre sesión', async () => {
  const { ctrl, created } = setup();
  const req = mockReq({ username: 'nuevo', email: 'n@x.com', password: 'abc123', full_name: 'N' });
  const res = mockRes();
  await ctrl.register(req, res, assert.ifError);
  assert.equal(res.statusCode, 201);
  assert.equal(created[0].passwordHash, 'hash:abc123');
  assert.equal(created[0].username, 'nuevo');
  assert.ok(!JSON.stringify(res.body).includes('abc123'));
  assert.equal(req.session.userId, 101);
});

test('registro: datos inválidos -> 400 con errores por campo', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.register(mockReq({ username: 'x', email: 'bad', password: '1' }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.fields.username && res.body.fields.email && res.body.fields.password);
});

test('registro: usuario o email repetido -> 409', async () => {
  const { ctrl } = setup({ users: [alice] });
  const res = mockRes();
  await ctrl.register(mockReq({ username: 'alice', email: 'otro@x.com', password: 'abc123' }), res, assert.ifError);
  assert.equal(res.statusCode, 409);
  assert.ok(res.body.fields.username);
});

test('login correcto: abre sesión y no devuelve el hash', async () => {
  const { ctrl } = setup({ users: [alice] });
  const req = mockReq({ identifier: 'alice', password: 'alice123' });
  const res = mockRes();
  await ctrl.login(req, res, assert.ifError);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.username, 'alice');
  assert.equal(req.session.userId, 1);
  assert.ok(!('password_hash' in res.body.user));
});

test('login: también acepta el email como identificador', async () => {
  const { ctrl } = setup({ users: [alice] });
  const res = mockRes();
  await ctrl.login(mockReq({ identifier: 'alice@x.com', password: 'alice123' }), res, assert.ifError);
  assert.equal(res.statusCode, 200);
});

test('login: usuario inexistente, contraseña errónea o cuenta desactivada -> 401', async () => {
  const { ctrl } = setup({ users: [alice, { ...alice, id: 2, username: 'off', email: 'off@x.com', is_active: false }] });
  for (const body of [
    { identifier: 'fantasma', password: 'x' },
    { identifier: 'alice', password: 'mala' },
    { identifier: 'off', password: 'alice123' },
  ]) {
    const res = mockRes();
    await ctrl.login(mockReq(body), res, assert.ifError);
    assert.equal(res.statusCode, 401, body.identifier);
    assert.ok(res.body.error);
  }
});

test('login: campos vacíos -> 400', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.login(mockReq({}), res, assert.ifError);
  assert.equal(res.statusCode, 400);
});

test('logout destruye la sesión y borra la cookie', async () => {
  const { ctrl } = setup();
  const req = mockReq();
  const res = mockRes();
  await ctrl.logout(req, res, assert.ifError);
  assert.equal(req.session.destroyed, true);
  assert.equal(res.clearedCookie, 'cybershop.sid');
});

test('me devuelve el usuario o null', () => {
  const { ctrl } = setup();
  const r1 = mockRes(); ctrl.me({ user: { id: 1 } }, r1);
  const r2 = mockRes(); ctrl.me({ user: null }, r2);
  assert.deepEqual(r1.body, { user: { id: 1 } });
  assert.deepEqual(r2.body, { user: null });
});

test('los errores inesperados van a next', async () => {
  const boom = new Error('db');
  const ctrl = createAuthController({
    userModel: { findAuthByIdentifier: async () => { throw boom; } },
    passwordService: fakePasswordService(),
  });
  let got;
  await ctrl.login(mockReq({ identifier: 'a', password: 'b' }), mockRes(), (e) => { got = e; });
  assert.equal(got, boom);
});
