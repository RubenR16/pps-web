'use strict';

const { ALL_STATUSES } = require('../services/orderStatus.service');

const ROLES = ['user', 'admin'];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** true / false / undefined (si el valor no es interpretable). */
function toBool(value) {
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'on') return true;
  if (value === false || value === 0 || value === '0' || value === 'false' || value === '') return false;
  return undefined;
}

function parsePrice(value) {
  const raw = typeof value === 'number' ? String(value) : text(value).replace(',', '.');
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 0.01 && n <= 99999.99 ? Math.round(n * 100) / 100 : null;
}

function parseIntRange(value, min, max) {
  let n = null;
  if (typeof value === 'number' && Number.isInteger(value)) n = value;
  else if (typeof value === 'string' && /^\d{1,9}$/.test(value.trim())) n = Number(value.trim());
  return n !== null && n >= min && n <= max ? n : null;
}

function validateProduct(body) {
  const errors = {};

  const name = text(body.name);
  if (name.length < 2 || name.length > 150) errors.name = 'El nombre debe tener entre 2 y 150 caracteres.';

  const description = text(body.description);
  if (description.length > 5000) errors.description = 'La descripción no puede superar los 5000 caracteres.';

  const price = parsePrice(body.price);
  if (price === null) errors.price = 'Precio no válido (entre 0,01 y 99999,99).';

  const stock = parseIntRange(body.stock, 0, 100000);
  if (stock === null) errors.stock = 'El stock debe ser un entero entre 0 y 100000.';

  let categoryId = null;
  if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '') {
    categoryId = parseIntRange(body.category_id, 1, 999999999);
    if (categoryId === null) errors.category_id = 'Categoría no válida.';
  }

  const isFeatured = body.is_featured === undefined ? false : toBool(body.is_featured);
  const isActive = body.is_active === undefined ? true : toBool(body.is_active);
  if (isFeatured === undefined) errors.is_featured = 'Valor no válido.';
  if (isActive === undefined) errors.is_active = 'Valor no válido.';

  return {
    errors,
    value: { name, description: description || null, price, stock, category_id: categoryId, is_featured: isFeatured, is_active: isActive },
  };
}

/** PUT /api/admin/users/:id  {role?, is_active?}  -> solo estos dos campos son modificables. */
function validateUserUpdate(body) {
  const errors = {};
  const value = {};

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) errors.role = 'Rol no válido.';
    else value.role = body.role;
  }
  if (body.is_active !== undefined) {
    const active = toBool(body.is_active);
    if (active === undefined) errors.is_active = 'Valor no válido.';
    else value.is_active = active;
  }
  if (!Object.keys(errors).length && !Object.keys(value).length) errors.role = 'No hay nada que actualizar.';
  return { errors, value };
}

function validateOrderStatus(body) {
  const errors = {};
  if (!ALL_STATUSES.includes(body.status)) errors.status = 'Estado no válido.';
  return { errors, value: { status: body.status } };
}

/** Filtro de estado del listado de pedidos: solo valores conocidos. */
function parseStatusFilter(query = {}) {
  return ALL_STATUSES.includes(query.status) ? query.status : '';
}

module.exports = { validateProduct, validateUserUpdate, validateOrderStatus, parseStatusFilter, toBool, parsePrice, ROLES };
