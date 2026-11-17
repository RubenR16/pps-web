'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validators/auth.validator');

const ok = { username: 'nuevo_user', email: 'Nuevo@Mail.com', password: 'abc123', full_name: ' Ana ' };

test('registro válido: normaliza email y nombre', () => {
  const { errors, value } = v.validateRegister(ok);
  assert.deepEqual(errors, {});
  assert.equal(value.email, 'nuevo@mail.com');
  assert.equal(value.full_name, 'Ana');
});

test('registro: usuario, email y contraseña inválidos', () => {
  const { errors } = v.validateRegister({ username: 'a', email: 'no-es-email', password: '12' });
  assert.ok(errors.username && errors.email && errors.password);
});

test('registro: el usuario solo admite letras, números, punto y guiones', () => {
  assert.ok(v.validateRegister({ ...ok, username: 'con espacio' }).errors.username);
  assert.equal(v.validateRegister({ ...ok, username: 'ana.garcia-1' }).errors.username, undefined);
});

test('contraseña: longitud mínima y máxima', () => {
  assert.match(v.passwordError('ab'), new RegExp(`al menos ${v.PASSWORD_MIN}`));
  assert.match(v.passwordError('a'.repeat(80)), /larga/);
  assert.equal(v.passwordError('abc'), null);
  assert.ok(v.passwordError(undefined));
  assert.ok(v.passwordError(['a']));
});

test('la longitud máxima se mide en bytes (límite de bcrypt)', () => {
  assert.ok(v.passwordError('ñ1'.repeat(25))); // 50 caracteres = 75 bytes
});

test('login: campos obligatorios y tipos', () => {
  assert.ok(v.validateLogin({}).errors.identifier);
  assert.ok(v.validateLogin({ identifier: 'x', password: ['a'] }).errors.password);
  assert.deepEqual(v.validateLogin({ identifier: ' alice ', password: 'x' }).errors, {});
  assert.equal(v.validateLogin({ identifier: ' alice ', password: 'x' }).value.identifier, 'alice');
});

test('perfil: devuelve los campos del perfil', () => {
  const { errors, value } = v.validateProfile({ email: 'a@b.com', full_name: 'Ana' });
  assert.deepEqual(errors, {});
  assert.deepEqual(Object.keys(value).sort(), ['address', 'city', 'country', 'email', 'full_name', 'phone', 'postal_code']);
  assert.equal(value.phone, null);
});

test('perfil: valida email, teléfono y código postal', () => {
  const { errors } = v.validateProfile({ email: 'x', phone: 'abc', postal_code: '<>' });
  assert.ok(errors.email && errors.phone && errors.postal_code);
});

test('cambio de contraseña', () => {
  assert.ok(v.validatePasswordChange({ current_password: '', new_password: 'nueva' }).errors.current_password);
  assert.ok(v.validatePasswordChange({ current_password: 'misma', new_password: 'misma' }).errors.new_password);
  assert.deepEqual(v.validatePasswordChange({ current_password: 'vieja', new_password: 'nueva' }).errors, {});
});
