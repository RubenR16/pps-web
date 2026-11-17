'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { imageUpload, mapUploadError } = require('../src/middleware/upload');
const { HttpError } = require('../src/utils/httpError');

test('mapUploadError: tamaño excedido -> 413', () => {
  const err = Object.assign(new Error('x'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' });
  const mapped = mapUploadError(err);
  assert.ok(mapped instanceof HttpError);
  assert.equal(mapped.status, 413);
  assert.match(mapped.message, /8 MB/);
});

test('mapUploadError: campo inesperado y otros errores de multer -> 400', () => {
  assert.equal(mapUploadError(Object.assign(new Error('x'), { name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE' })).status, 400);
  assert.equal(mapUploadError(Object.assign(new Error('x'), { name: 'MulterError', code: 'LIMIT_PART_COUNT' })).status, 400);
});

test('mapUploadError deja pasar errores que no son de multer', () => {
  const boom = new Error('otro');
  assert.equal(mapUploadError(boom), boom);
});

test('imageUpload opcional: una petición JSON continúa sin procesar', () => {
  let called = false;
  imageUpload()({ is: () => false }, {}, (err) => { called = !err; });
  assert.equal(called, true);
});

test('imageUpload requerido: una petición no multipart -> 400', () => {
  let got;
  imageUpload({ required: true })({ is: () => false }, {}, (err) => { got = err; });
  assert.ok(got instanceof HttpError);
  assert.equal(got.status, 400);
});
