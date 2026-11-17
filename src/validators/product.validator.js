'use strict';

const SORT_KEYS = ['newest', 'price_asc', 'price_desc', 'name'];
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

/** Entero positivo desde un string de la query; si no es válido devuelve fallback. Se acota a [min, max]. */
function toInt(value, fallback, min, max) {
  if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) return fallback;
  return Math.min(Math.max(Number(value), min), max);
}

/** Identificador positivo (para rutas tipo /api/products/:id). Devuelve null si no es válido. */
function parseId(value) {
  if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

/** Normaliza los parámetros del listado de productos. Ignora valores que no sean string (p. ej. ?search=a&search=b). */
function parseProductQuery(query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const category = typeof query.category === 'string' ? query.category.trim() : '';
  const sort = SORT_KEYS.includes(query.sort) ? query.sort : 'newest';

  return {
    search,
    category,
    sort,
    featured: query.featured === '1' || query.featured === 'true',
    excludeId: parseId(query.exclude),
    page: toInt(query.page, 1, 1, 10000),
    limit: toInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT),
  };
}

module.exports = { parseProductQuery, parseId, SORT_KEYS, DEFAULT_LIMIT, MAX_LIMIT };
