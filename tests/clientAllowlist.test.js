'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { clientAllowlist } = require('../src/middleware/clientAllowlist');
const { loadConfig } = require('../src/config/env');

function run(config, remoteAddress) {
  const mw = clientAllowlist(config);
  let nextCalled = false;
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(b) { this.body = b; return this; },
  };
  mw({ socket: { remoteAddress } }, res, () => { nextCalled = true; });
  return { nextCalled, res };
}

const classConfig = () => loadConfig({
  HOST: '172.29.230.189',
  LAB_LAN_ENABLED: 'true',
  LAB_ALLOWED_CLIENTS: '172.29.230.128/25, 10.0.0.7',
});

test('permite loopback', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    assert.equal(run(loadConfig({}), ip).nextCalled, true, ip);
  }
});

test('sin acceso del aula: bloquea IPs no locales', () => {
  const { nextCalled, res } = run(loadConfig({}), '192.168.1.50');
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('acceso del aula: permite la subred del aula y las IPs concretas (también como ::ffff:)', () => {
  const c = classConfig();
  for (const ip of ['172.29.230.129', '172.29.230.200', '172.29.230.254', '::ffff:172.29.230.140', '10.0.0.7', '127.0.0.1']) {
    assert.equal(run(c, ip).nextCalled, true, ip);
  }
});

test('acceso del aula: bloquea IPs fuera de la lista', () => {
  const c = classConfig();
  for (const ip of ['172.29.230.127', '172.29.231.10', '10.0.0.8', '192.168.1.50', 'fe80::1']) {
    const { nextCalled, res } = run(c, ip);
    assert.equal(nextCalled, false, ip);
    assert.equal(res.statusCode, 403, ip);
  }
});

test('acceso del aula con HOST loopback: la lista no tiene efecto (solo localhost)', () => {
  const c = loadConfig({ HOST: '127.0.0.1', LAB_LAN_ENABLED: 'true', LAB_ALLOWED_CLIENTS: '172.29.230.128/25' });
  assert.equal(c.lab.lanEnabled, false);
  assert.equal(run(c, '172.29.230.140').nextCalled, false);
});
