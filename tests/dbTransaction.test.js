'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

/** Carga src/config/db.js con un mysql2 falso (no hace falta tener mysql2 instalado). */
function loadDbWithFakeMysql() {
  const events = [];
  const conn = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    execute: async (sql, params) => { events.push(`exec:${sql}`); return [[{ ok: 1 }]]; },
  };
  const fake = { createPool: () => ({ getConnection: async () => conn, execute: async () => [[]], query: async () => [[]], end: async () => {} }) };

  const originalLoad = Module._load;
  Module._load = function (request, ...rest) { return request === 'mysql2/promise' ? fake : originalLoad.call(this, request, ...rest); };
  const modulePath = require.resolve('../src/config/db');
  delete require.cache[modulePath];
  const { createDb } = require(modulePath);
  Module._load = originalLoad;
  delete require.cache[modulePath];

  const db = createDb({ host: 'h', port: 1, user: 'u', password: '', database: 'd', connectionLimit: 1 });
  return { db, events };
}

test('transaction: commit y liberación de la conexión si todo va bien', async () => {
  const { db, events } = loadDbWithFakeMysql();
  const result = await db.transaction(async (tx) => { await tx.execute('SELECT 1'); return 'hecho'; });
  assert.equal(result, 'hecho');
  assert.deepEqual(events, ['begin', 'exec:SELECT 1', 'commit', 'release']);
});

test('transaction: rollback y relanzar el error si algo falla', async () => {
  const { db, events } = loadDbWithFakeMysql();
  await assert.rejects(db.transaction(async () => { throw new Error('boom'); }), /boom/);
  assert.deepEqual(events, ['begin', 'rollback', 'release']);
});
