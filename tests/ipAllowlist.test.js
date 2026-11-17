'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAllowlist, matchesAllowlist, isValidIpv4, normalizeRemoteAddress } = require('../src/utils/ipAllowlist');

test('isValidIpv4', () => {
  assert.equal(isValidIpv4('172.29.230.189'), true);
  for (const bad of ['256.1.1.1', '1.2.3', '1.2.3.4.5', 'a.b.c.d', '', '::1', '01234.1.1.1']) {
    assert.equal(isValidIpv4(bad), false, bad);
  }
});

test('parseAllowlist: IPs sueltas y subredes', () => {
  const rules = parseAllowlist(' 172.29.230.128/25 ,10.0.0.7,, ');
  assert.equal(rules.length, 2);
  assert.equal(rules[0].prefix, 25);
  assert.equal(rules[1].prefix, 32);
  assert.deepEqual(parseAllowlist(''), []);
  assert.deepEqual(parseAllowlist(undefined), []);
});

test('parseAllowlist: normaliza la red aunque se escriba una IP del medio', () => {
  const [r] = parseAllowlist('172.29.230.189/25');
  assert.equal(matchesAllowlist('172.29.230.129', [r]), true);
  assert.equal(matchesAllowlist('172.29.230.127', [r]), false);
});

test('parseAllowlist: rechaza entradas inválidas o demasiado amplias', () => {
  assert.throws(() => parseAllowlist('0.0.0.0/0'), /demasiado amplia/);
  assert.throws(() => parseAllowlist('10.0.0.0/8'), /demasiado amplia/);
  assert.throws(() => parseAllowlist('172.29.230.0/33'), /prefijo/);
  assert.throws(() => parseAllowlist('172.29.230.0/'), /prefijo/);
  assert.throws(() => parseAllowlist('aula'), /IPv4/);
  assert.throws(() => parseAllowlist('1.2.3.4/24/1'), /inválida/);
});

test('normalizeRemoteAddress quita el prefijo IPv4-mapeado', () => {
  assert.equal(normalizeRemoteAddress('::ffff:172.29.230.140'), '172.29.230.140');
  assert.equal(normalizeRemoteAddress('172.29.230.140'), '172.29.230.140');
});
