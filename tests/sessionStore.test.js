'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const createStore = require('../src/session/mysqlSessionStore');

const MySqlSessionStore = createStore({ Store: class extends EventEmitter {} });

function fakeDb(rows = []) {
  const calls = [];
  return {
    calls,
    async execute(sql, params) { calls.push({ sql, params }); return rows; },
    async query(sql) { calls.push({ sql, params: null }); return []; },
  };
}

const wait = (fn) => new Promise((resolve) => fn((err, val) => resolve({ err, val })));

test('init crea la tabla y limpia sesiones caducadas', async () => {
  const db = fakeDb();
  const store = new MySqlSessionStore(db, { cleanupIntervalMs: 1e9 });
  await store.init();
  store.close();
  assert.match(db.calls[0].sql, /CREATE TABLE IF NOT EXISTS sessions/);
  assert.match(db.calls[0].sql, /ascii_bin/);
  assert.match(db.calls[1].sql, /DELETE FROM sessions WHERE expires <= \?/);
});

test('set guarda JSON y usa la caducidad de la cookie', async () => {
  const db = fakeDb();
  const store = new MySqlSessionStore(db);
  const expires = new Date(Date.now() + 5000);
  const { err } = await wait((cb) => store.set('abc', { userId: 1, cookie: { expires } }, cb));
  assert.equal(err, null);
  const [sid, exp, data] = db.calls[0].params;
  assert.equal(sid, 'abc');
  assert.equal(exp, expires.getTime());
  assert.equal(JSON.parse(data).userId, 1);
});

test('set sin expires en la cookie usa el TTL por defecto', async () => {
  const db = fakeDb();
  const store = new MySqlSessionStore(db, { ttlMs: 1000 });
  const before = Date.now();
  await wait((cb) => store.set('abc', { cookie: {} }, cb));
  const exp = db.calls[0].params[1];
  assert.ok(exp >= before + 1000 && exp <= Date.now() + 1000);
});

test('get devuelve la sesión parseada o null', async () => {
  const hit = new MySqlSessionStore(fakeDb([{ data: '{"userId":9}' }]));
  assert.deepEqual((await wait((cb) => hit.get('s', cb))).val, { userId: 9 });
  const miss = new MySqlSessionStore(fakeDb([]));
  assert.equal((await wait((cb) => miss.get('s', cb))).val, null);
});

test('get solo considera sesiones no caducadas', async () => {
  const db = fakeDb([]);
  await wait((cb) => new MySqlSessionStore(db).get('abc', cb));
  assert.match(db.calls[0].sql, /expires > \?/);
  assert.equal(db.calls[0].params[0], 'abc');
});

test('get con datos corruptos devuelve error en vez de lanzar', async () => {
  const { err } = await wait((cb) => new MySqlSessionStore(fakeDb([{ data: '{no-json' }])).get('s', cb));
  assert.ok(err instanceof Error);
});

test('destroy y touch ejecutan la sentencia correcta', async () => {
  const db = fakeDb();
  const store = new MySqlSessionStore(db);
  await wait((cb) => store.destroy('s1', cb));
  await wait((cb) => store.touch('s1', { cookie: {} }, cb));
  assert.match(db.calls[0].sql, /^DELETE FROM sessions WHERE session_id = \?/);
  assert.match(db.calls[1].sql, /^UPDATE sessions SET expires/);
});

test('los errores de base de datos llegan al callback', async () => {
  const boom = new Error('db caída');
  const db = { execute: async () => { throw boom; } };
  const store = new MySqlSessionStore(db);
  assert.equal((await wait((cb) => store.get('s', cb))).err, boom);
  assert.equal((await wait((cb) => store.set('s', {}, cb))).err, boom);
});
