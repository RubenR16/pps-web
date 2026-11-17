'use strict';

function toInt(value, fallback, min, max) {
  if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) return fallback;
  return Math.min(Math.max(Number(value), min), max);
}

/** Lee page y limit de la query (acotados) y calcula offset. */
function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = toInt(query.page, 1, 1, 100000);
  const limit = toInt(query.limit, defaultLimit, 1, maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

function paged(items, total, { page, limit }) {
  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Texto de búsqueda de la query: solo strings, recortado. */
function parseSearch(query = {}) {
  return typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
}

/** Escapa los comodines de LIKE para que "%" o "_" se busquen literalmente. */
function escapeLike(text) {
  return text.replace(/[\\%_]/g, '\\$&');
}

module.exports = { parsePagination, paged, parseSearch, escapeLike };
