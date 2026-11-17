'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminProductController } = require('../src/controllers/adminProduct.controller');
const { HttpError } = require('../src/utils/httpError');
const { mockReq, mockRes } = require('./helpers');

const valid = { name: 'Teclado X', price: '79.90', stock: '5', category_id: '1', description: '', is_featured: false, is_active: true };

function setup({ existing = { id: 3, image: '/uploads/products/old.jpg' }, createError = null } = {}) {
  const calls = { removed: [], saved: [], created: null, updated: null, image: undefined };
  const model = {
    list: async () => ({ items: [], total: 0 }),
    findById: async (id) => (existing && id === existing.id ? existing : (calls.created ? { id } : null)),
    create: async (v) => { if (createError) throw createError; calls.created = v; return 77; },
    update: async (id, v) => { calls.updated = { id, v }; },
    setImage: async (id, url) => { calls.image = url; },
    remove: async () => 1,
  };
  const uploads = {
    saveImage: async (buf, folder) => { calls.saved.push(folder); return '/uploads/products/new.png'; },
    remove: async (url) => { calls.removed.push(url); return true; },
  };
  return { calls, ctrl: createAdminProductController({ model, uploads }) };
}

test('crear: valida, guarda y devuelve 201', async () => {
  const { ctrl, calls } = setup({ existing: null });
  const res = mockRes();
  await ctrl.create(mockReq(valid), res, assert.ifError);
  assert.equal(res.statusCode, 201);
  assert.equal(calls.created.price, 79.9);
  assert.equal(res.body.product.id, 77);
});

test('crear: datos inválidos -> 400 y no toca la base de datos', async () => {
  const { ctrl, calls } = setup({ existing: null });
  const res = mockRes();
  await ctrl.create(mockReq({ name: '' }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.created, null);
});

test('crear: categoría inexistente (clave foránea) -> 400', async () => {
  const { ctrl } = setup({ existing: null, createError: Object.assign(new Error('fk'), { code: 'ER_NO_REFERENCED_ROW_2' }) });
  const res = mockRes();
  await ctrl.create(mockReq(valid), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.fields.category_id);
});

test('actualizar: 404 si no existe, 400 con id inválido', async () => {
  const { ctrl } = setup();
  const r1 = mockRes(); await ctrl.update(mockReq(valid, { params: { id: '99' } }), r1, assert.ifError);
  const r2 = mockRes(); await ctrl.update(mockReq(valid, { params: { id: 'x' } }), r2, assert.ifError);
  assert.equal(r1.statusCode, 404);
  assert.equal(r2.statusCode, 400);
});

test('actualizar: aplica los cambios', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.update(mockReq(valid, { params: { id: '3' } }), res, assert.ifError);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.updated.id, 3);
});

test('eliminar: borra el producto y su imagen', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.remove(mockReq({}, { params: { id: '3' } }), res, assert.ifError);
  assert.deepEqual(res.body, { ok: true });
  assert.deepEqual(calls.removed, ['/uploads/products/old.jpg']);
});

test('subir imagen: guarda la nueva, actualiza la base de datos y borra la anterior', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.uploadImage(mockReq({}, { params: { id: '3' }, file: { buffer: Buffer.from('x') } }), res, assert.ifError);
  assert.deepEqual(calls.saved, ['products']);
  assert.equal(calls.image, '/uploads/products/new.png');
  assert.deepEqual(calls.removed, ['/uploads/products/old.jpg']);
});

test('subir imagen: si la validación del contenido falla se responde con su código y no se cambia nada', async () => {
  const { calls } = setup();
  const failing = createAdminProductController({
    model: { findById: async () => ({ id: 3, image: null }), setImage: async () => { calls.image = 'x'; } },
    uploads: { saveImage: async () => { throw new HttpError(400, 'Formato no permitido.'); }, remove: async () => {} },
  });
  const res = mockRes();
  await failing.uploadImage(mockReq({}, { params: { id: '3' }, file: { buffer: Buffer.from('x') } }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.image, undefined);
});

test('subir imagen: si falla la base de datos se borra el archivo recién guardado', async () => {
  const removed = [];
  const ctrl = createAdminProductController({
    model: { findById: async () => ({ id: 3, image: null }), setImage: async () => { throw new Error('db'); } },
    uploads: { saveImage: async () => '/uploads/products/tmp.png', remove: async (u) => { removed.push(u); } },
  });
  let err;
  await ctrl.uploadImage(mockReq({}, { params: { id: '3' }, file: { buffer: Buffer.from('x') } }), mockRes(), (e) => { err = e; });
  assert.ok(err);
  assert.deepEqual(removed, ['/uploads/products/tmp.png']);
});

test('quitar imagen', async () => {
  const { ctrl, calls } = setup();
  await ctrl.removeImage(mockReq({}, { params: { id: '3' } }), mockRes(), assert.ifError);
  assert.equal(calls.image, null);
  assert.deepEqual(calls.removed, ['/uploads/products/old.jpg']);
});
