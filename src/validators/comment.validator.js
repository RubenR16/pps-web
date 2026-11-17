'use strict';

const MAX_COMMENT = 1000;

function validateComment(body) {
  const errors = {};
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) errors.content = 'Escribe un comentario.';
  else if (content.length > MAX_COMMENT) errors.content = `Máximo ${MAX_COMMENT} caracteres.`;
  return { errors, value: { content } };
}

module.exports = { validateComment, MAX_COMMENT };
