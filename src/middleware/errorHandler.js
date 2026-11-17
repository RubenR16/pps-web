'use strict';

function notFound(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada.' });
  }
  return res.status(404).send('404 - Página no encontrada');
}

/** Manejo de errores: devuelve el detalle del error para facilitar la depuración. */
function errorHandler() {
  // eslint-disable-next-line no-unused-vars
  return function (err, req, res, next) {
    const status = err.status || 500;
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${err.message}`);
    res.status(status).json({ error: err.message, stack: err.stack, sql: err.sql });
  };
}

module.exports = { notFound, errorHandler };
