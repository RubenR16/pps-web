'use strict';

/** Error con código HTTP asociado (reglas de negocio: stock, carrito vacío...). */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Responde con el código del HttpError; cualquier otro error se delega en el manejador global. */
function respondError(err, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  return next(err);
}

module.exports = { HttpError, respondError };
