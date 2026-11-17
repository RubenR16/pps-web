'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCommentController } = require('../src/controllers/comment.controller');
const { HttpError } = require('../src/utils/httpError');
const { mockReq, mockRes } = require('./helpers');

function setup({ saveError = null, createError = null } = {}) {
  const calls = { created: null, removed: [], deleted: null };
  const comments = { 5: { id: 5, user_id: 7, image: '/uploads/comments/c.png', content: 'hola' } };
  const ctrl = createCommentController({
    commentModel: {
      listByProduct: async () => [{ id: 5 }],
      findById: async (id) => comments[id] || (calls.created ? { id, ...calls.created } : null),
      create: async (v) => { if (createError) throw createError; calls.created = v; return 6; },
      remove: async (id) => { calls.deleted = id; },
    },
    productModel: { findById: async (id) => (id === 1 ? { id: 1 } : null) },
    uploads: {
      saveImage: async () => { if (saveError) throw saveError; return '/uploads/comments/new.png'; },
      remove: async (u) => { calls.removed.push(u); },
    },
  });
  return { ctrl, calls };
}
const user = { id: 7, role: 'user' };

test('listar: producto existente / inexistente / id inválido', async () => {
  const { ctrl } = setup();
  const ok = mockRes(); await ctrl.list(mockReq({}, { params: { productId: '1' } }), ok, assert.ifError);
  const missing = mockRes(); await ctrl.list(mockReq({}, { params: { productId: '2' } }), missing, assert.ifError);
  const bad = mockRes(); await ctrl.list(mockReq({}, { params: { productId: 'x' } }), bad, assert.ifError);
  assert.deepEqual([ok.statusCode, missing.statusCode, bad.statusCode], [200, 404, 400]);
});

test('crear: el autor sale de la sesión, no del cuerpo', async () => {
  const { ctrl, calls } = setup();
  const res = mockRes();
  await ctrl.create(mockReq({ content: ' Muy bueno ', user_id: 1, product_id: 99 }, { user, params: { productId: '1' } }), res, assert.ifError);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(calls.created, { productId: 1, userId: 7, content: 'Muy bueno', image: null });
});

test('crear con imagen: se guarda en la carpeta de comentarios', async () => {
  const { ctrl, calls } = setup();
  await ctrl.create(mockReq({ content: 'foto' }, { user, params: { productId: '1' }, file: { buffer: Buffer.from('x') } }), mockRes(), assert.ifError);
  assert.equal(calls.created.image, '/uploads/comments/new.png');
});

test('crear: contenido vacío o demasiado largo -> 400', async () => {
  const { ctrl } = setup();
  for (const content of ['', '   ', 'x'.repeat(1001)]) {
    const res = mockRes();
    await ctrl.create(mockReq({ content }, { user, params: { productId: '1' } }), res, assert.ifError);
    assert.equal(res.statusCode, 400);
  }
});

test('crear: imagen no válida -> código del error y no se crea el comentario', async () => {
  const { ctrl, calls } = setup({ saveError: new HttpError(400, 'Formato no permitido.') });
  const res = mockRes();
  await ctrl.create(mockReq({ content: 'x' }, { user, params: { productId: '1' }, file: { buffer: Buffer.from('x') } }), res, assert.ifError);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.created, null);
});

test('crear: si falla la base de datos se borra la imagen guardada', async () => {
  const { ctrl, calls } = setup({ createError: new Error('db') });
  let err;
  await ctrl.create(mockReq({ content: 'x' }, { user, params: { productId: '1' }, file: { buffer: Buffer.from('x') } }), mockRes(), (e) => { err = e; });
  assert.ok(err);
  assert.deepEqual(calls.removed, ['/uploads/comments/new.png']);
});

test('borrar: el autor puede, un administrador puede, otro usuario no (403)', async () => {
  const author = setup(); const rA = mockRes();
  await author.ctrl.remove(mockReq({}, { user, params: { id: '5' } }), rA, assert.ifError);
  const adm = setup(); const rB = mockRes();
  await adm.ctrl.remove(mockReq({}, { user: { id: 1, role: 'admin' }, params: { id: '5' } }), rB, assert.ifError);
  const other = setup(); const rC = mockRes();
  await other.ctrl.remove(mockReq({}, { user: { id: 8, role: 'user' }, params: { id: '5' } }), rC, assert.ifError);
  assert.deepEqual([rA.statusCode, rB.statusCode, rC.statusCode], [200, 200, 403]);
  assert.equal(other.calls.deleted, null);
  assert.deepEqual(author.calls.removed, ['/uploads/comments/c.png']);
});

test('borrar: comentario inexistente -> 404', async () => {
  const { ctrl } = setup();
  const res = mockRes();
  await ctrl.remove(mockReq({}, { user, params: { id: '99' } }), res, assert.ifError);
  assert.equal(res.statusCode, 404);
});
