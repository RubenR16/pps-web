'use strict';

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{6,30}$/;
const POSTAL_RE = /^[A-Za-z0-9 -]{3,12}$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const PASSWORD_MIN = 3;
const PASSWORD_MAX = 72; // bcrypt solo usa los 72 primeros bytes

/** Devuelve un mensaje de error si la contraseña no es válida, o null si lo es. */
function passwordError(password) {
  if (typeof password !== 'string' || password.length === 0) return 'La contraseña es obligatoria.';
  if (password.length < PASSWORD_MIN) return `Debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX) return `Es demasiado larga (máximo ${PASSWORD_MAX} caracteres).`;
  return null;
}

function validateRegister(body) {
  const errors = {};
  const username = text(body.username);
  const email = text(body.email).toLowerCase();
  const fullName = text(body.full_name);
  const password = body.password;

  if (!USERNAME_RE.test(username)) errors.username = 'Entre 3 y 30 caracteres: letras, números, punto, guion y guion bajo.';
  if (email.length > 120 || !EMAIL_RE.test(email)) errors.email = 'Introduce un email válido.';
  if (fullName.length > 120) errors.full_name = 'Máximo 120 caracteres.';
  const pwError = passwordError(password);
  if (pwError) errors.password = pwError;

  return { errors, value: { username, email, full_name: fullName || null, password } };
}

function validateLogin(body) {
  const errors = {};
  const identifier = text(body.identifier);
  const password = body.password;

  if (!identifier) errors.identifier = 'Introduce tu usuario o email.';
  if (typeof password !== 'string' || password.length === 0 || password.length > 1024) errors.password = 'Introduce tu contraseña.';

  return { errors, value: { identifier, password } };
}

function optional(body, field, max, errors, label, regex) {
  const value = text(body[field]);
  if (value.length > max) errors[field] = `${label}: máximo ${max} caracteres.`;
  else if (value && regex && !regex.test(value)) errors[field] = `${label} no tiene un formato válido.`;
  return value || null;
}

function validateProfile(body) {
  const errors = {};
  const email = text(body.email).toLowerCase();
  if (email.length > 120 || !EMAIL_RE.test(email)) errors.email = 'Introduce un email válido.';

  const value = {
    full_name: optional(body, 'full_name', 120, errors, 'Nombre'),
    email,
    phone: optional(body, 'phone', 30, errors, 'Teléfono', PHONE_RE),
    address: optional(body, 'address', 255, errors, 'Dirección'),
    city: optional(body, 'city', 80, errors, 'Ciudad'),
    postal_code: optional(body, 'postal_code', 12, errors, 'Código postal', POSTAL_RE),
    country: optional(body, 'country', 80, errors, 'País'),
  };
  return { errors, value };
}

function validatePasswordChange(body) {
  const errors = {};
  const current = body.current_password;
  const next = body.new_password;

  if (typeof current !== 'string' || current.length === 0 || current.length > 1024) errors.current_password = 'Introduce tu contraseña actual.';
  const pwError = passwordError(next);
  if (pwError) errors.new_password = pwError;
  else if (next === current) errors.new_password = 'La nueva contraseña debe ser distinta de la actual.';

  return { errors, value: { current_password: current, new_password: next } };
}

module.exports = { validateRegister, validateLogin, validateProfile, validatePasswordChange, passwordError, EMAIL_RE, PASSWORD_MIN };
