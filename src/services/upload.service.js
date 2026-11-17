'use strict';

const path = require('path');
const fsPromises = require('fs/promises');
const { HttpError } = require('../utils/httpError');

const FOLDERS = ['products', 'comments'];

/**
 * Guarda las imágenes subidas en public/uploads/<carpeta>/ con su nombre original,
 * para que se puedan reconocer fácilmente desde el panel.
 */
function createUploadService({ baseDir, fs = fsPromises }) {
  function fileNameOf(originalName) {
    const base = path.basename(String(originalName || 'imagen')).replace(/[\u0000-\u001f]/g, '');
    return base || 'imagen';
  }

  async function saveImage(buffer, folder, originalName) {
    if (!FOLDERS.includes(folder)) throw new Error(`Carpeta de subida no válida: ${folder}`);
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new HttpError(400, 'No se ha recibido ninguna imagen.');

    const filename = fileNameOf(originalName);
    const dir = path.join(baseDir, folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buffer, { mode: 0o644 });
    return `/uploads/${folder}/${filename}`;
  }

  /** Borra un archivo subido a partir de su URL pública. Devuelve true si se borró. */
  async function remove(url) {
    const match = /^\/uploads\/(products|comments)\/([^/]+)$/.exec(typeof url === 'string' ? url : '');
    if (!match) return false;
    try {
      await fs.unlink(path.join(baseDir, match[1], path.basename(match[2])));
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  return { saveImage, remove };
}

module.exports = { createUploadService };
