'use strict';

const { HttpError } = require('../utils/httpError');

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** Traduce los errores de multer a HttpError con mensajes en español. */
function mapUploadError(err) {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new HttpError(413, `La imagen supera el máximo de ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return new HttpError(400, 'Campo de archivo no esperado. Usa "image".');
    return new HttpError(400, 'La subida no es válida.');
  }
  return err;
}

/**
 * Middleware que procesa UNA imagen en el campo "image" (multipart/form-data) y la deja en memoria
 * (req.file.buffer); el guardado lo hace upload.service.
 *  - required: true  -> responde 400 si no llega ningún archivo.
 *  - required: false -> si la petición no es multipart (p. ej. JSON) simplemente continúa.
 * multer se carga de forma perezosa para poder probar el resto sin tenerlo instalado.
 */
function imageUpload({ required = false } = {}) {
  let parser = null;
  return function imageUploadMiddleware(req, res, next) {
    if (!req.is('multipart/form-data')) {
      return required ? next(new HttpError(400, 'Envía la imagen como multipart/form-data en el campo "image".')) : next();
    }
    if (!parser) {
      const multer = require('multer');
      parser = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_BYTES, files: 1, fields: 10, parts: 12 },
      }).single('image');
    }
    return parser(req, res, (err) => {
      if (err) return next(mapUploadError(err));
      if (required && !req.file) return next(new HttpError(400, 'No se ha recibido ninguna imagen.'));
      return next();
    });
  };
}

module.exports = { imageUpload, mapUploadError, MAX_BYTES };
