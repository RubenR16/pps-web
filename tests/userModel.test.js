'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createUserModel } = require('../src/models/user.model');

function fakeDb(rows = [], result = {}) {
  const calls = [];
  const respond = () => (Array.isArray(rows) ? rows : result);
  return {
    calls,
    async execute(sql, params) { calls.push({ sql, params }); return respond(); },
    async query(sql) { calls.push({ sql }); return respond(); },
  };
}

test('findById no selecciona password_hash', async () => {
  const db = fakeDb([{ id: 1, is_active: 1 }]);
  const user = await createUserModel(db).findById(1);
  assert.ok(!db.calls[0].sql.includes('password_hash'));
  assert.deepEqual(db.calls[0].params, [1]);
  assert.equal(user.is_active, true);
});

test('findAuthByIdentifier busca por usuario o email e incluye el hash', async () => {
  const db = fakeDb([{ id: 2, password_hash: 'x', is_active: 1 }]);
  const row = await createUserModel(db).findAuthByIdentifier('alice');
  assert.ok(db.calls[0].sql.includes('password_hash'));
  assert.match(db.calls[0].sql, /username = .* OR email = /);
  assert.equal(row.is_active, true);
});

test('findTaken compara sin distinguir mayúsculas y excluye al propio usuario', async () => {
  const db = fakeDb([{ username: 'Alice', email: 'alice@x.com' }]);
  const taken = await createUserModel(db).findTaken({ username: 'alice', email: 'otro@x.com', excludeId: 7 });
  assert.deepEqual(taken, { username: true, email: false });
  assert.equal(db.calls[0].params.at(-1), 7);
});

test('findTaken sin datos no consulta', async () => {
  const db = fakeDb();
  assert.deepEqual(await createUserModel(db).findTaken({}), { username: false, email: false });
  assert.equal(db.calls.length, 0);
});

test('create usa el rol "user" por defecto y devuelve insertId', async () => {
  const db = fakeDb(null, { insertId: 42 });
  const id = await createUserModel(db).create({ username: 'u', email: 'e@x.com', passwordHash: 'h', full_name: null });
  assert.equal(id, 42);
  assert.deepEqual(db.calls[0].params, ['u', 'e@x.com', 'h', null, 'user']);
});

test('updateEmail actualiza el email del usuario', async () => {
  const db = fakeDb(null, {});
  await createUserModel(db).updateEmail(5, 'n@x.com');
  assert.deepEqual(db.calls[0].params, ['n@x.com', 5]);
});

test('updateProfile actualiza los campos del perfil', async () => {
  const db = fakeDb(null, {});
  await createUserModel(db).updateProfile(5, {
    full_name: 'A', email: 'a@b.com', phone: null, address: null, city: null, postal_code: null, country: null,
  });
  assert.ok(!/role|password_hash|is_active/i.test(db.calls[0].sql));
  assert.equal(db.calls[0].params.at(-1), 5);
});

test('getPasswordHash devuelve null si no hay usuario', async () => {
  assert.equal(await createUserModel(fakeDb([])).getPasswordHash(1), null);
});
