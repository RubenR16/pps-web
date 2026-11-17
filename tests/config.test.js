'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config/env');

test('valores por defecto', () => {
  const c = loadConfig({});
  assert.equal(c.host, '127.0.0.1');
  assert.equal(c.port, 3000);
  assert.equal(c.db.database, 'cybershop');
  assert.equal(c.lab.lanEnabled, false);
  assert.deepEqual(c.lab.allowedClients, []);
});

test('acepta cualquier dirección de loopback como HOST', () => {
  for (const HOST of ['127.0.0.1', 'localhost', '::1']) assert.equal(loadConfig({ HOST }).host, HOST);
});

test('sin acceso del aula, rechaza HOST fuera de loopback', () => {
  assert.throws(() => loadConfig({ HOST: '0.0.0.0' }), /HOST debe ser 127\.0\.0\.1/);
  assert.throws(() => loadConfig({ HOST: '192.168.1.20' }), /HOST debe ser 127\.0\.0\.1/);
});

test('acceso del aula: acepta la IP del aula con lista de clientes', () => {
  const c = loadConfig({ HOST: '172.29.230.189', LAB_LAN_ENABLED: 'true', LAB_ALLOWED_CLIENTS: '172.29.230.128/25' });
  assert.equal(c.host, '172.29.230.189');
  assert.equal(c.lab.lanEnabled, true);
  assert.equal(c.lab.allowedClients.length, 1);
});

test('acceso del aula: exige LAB_ALLOWED_CLIENTS', () => {
  assert.throws(() => loadConfig({ HOST: '172.29.230.189', LAB_LAN_ENABLED: 'true' }), /LAB_ALLOWED_CLIENTS/);
});

test('acceso del aula: rechaza 0.0.0.0, :: y nombres como HOST', () => {
  const base = { LAB_LAN_ENABLED: 'true', LAB_ALLOWED_CLIENTS: '172.29.230.128/25' };
  for (const HOST of ['0.0.0.0', '::', 'mi-pc.local']) {
    assert.throws(() => loadConfig({ ...base, HOST }), /IPv4 concreta/, HOST);
  }
});

test('acceso del aula: rechaza subredes demasiado amplias y booleanos inválidos', () => {
  assert.throws(() => loadConfig({ HOST: '172.29.230.189', LAB_LAN_ENABLED: 'true', LAB_ALLOWED_CLIENTS: '0.0.0.0/0' }), /demasiado amplia/);
  assert.throws(() => loadConfig({ LAB_LAN_ENABLED: 'si' }), /LAB_LAN_ENABLED/);
});

test('valida puertos y nombre de base de datos', () => {
  assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT/);
  assert.throws(() => loadConfig({ PORT: '70000' }), /PORT/);
  assert.throws(() => loadConfig({ DB_NAME: 'a;DROP' }), /DB_NAME/);
});

test('la configuración es inmutable', () => {
  const c = loadConfig({});
  assert.throws(() => { 'use strict'; c.host = '0.0.0.0'; }, TypeError);
});
