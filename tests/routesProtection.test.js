'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { requireAuth } = require('../src/middleware/auth');
const { mockRes } = require('./helpers');

/** Carga un archivo de rutas con un "express" falso que solo registra lo que se monta, en orden. */
function loadRoutes(file) {
  function Router() {
    const entries = [];
    const router = { entries };
    for (const method of ['use', 'get', 'post', 'put', 'delete']) {
      router[method] = (...args) => { entries.push({ method, args }); return router; };
    }
    return router;
  }
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) { return request === 'express' ? { Router } : originalLoad.call(this, request, ...rest); };
  const resolved = require.resolve(file);
  delete require.cache[resolved];
  try { return require(resolved); } finally { Module._load = originalLoad; delete require.cache[resolved]; }
}

const fakeDb = { execute: async () => [] };

test('/api/admin: lo primero que se monta es requireRole("admin")', () => {
  const { adminRoutes } = loadRoutes('../src/routes/admin.routes');
  const router = adminRoutes({ db: fakeDb, userModel: {}, uploads: {} });
  const first = router.entries[0];
  assert.equal(first.method, 'use');

  // El guardián real: sin sesión -> 401; usuario normal -> 403; administrador -> pasa.
  const guard = first.args[0];
  const r1 = mockRes(); guard({ user: null }, r1, () => assert.fail('no debe pasar'));
  const r2 = mockRes(); guard({ user: { role: 'user' } }, r2, () => assert.fail('no debe pasar'));
  let passed = false; guard({ user: { role: 'admin' } }, mockRes(), () => { passed = true; });
  assert.deepEqual([r1.statusCode, r2.statusCode, passed], [401, 403, true]);

  // Y hay rutas registradas después del guardián (no está vacío).
  assert.ok(router.entries.slice(1).filter((e) => e.method !== 'use').length >= 12);
});

for (const [name, file, factory] of [
  ['cart', '../src/routes/cart.routes', 'cartRoutes'],
  ['orders', '../src/routes/orders.routes', 'orderRoutes'],
  ['profile', '../src/routes/profile.routes', 'profileRoutes'],
]) {
  test(`/api/${name}: requireAuth se monta antes que cualquier ruta`, () => {
    const router = loadRoutes(file)[factory]({ db: fakeDb, userModel: {}, passwordService: {} });
    assert.equal(router.entries[0].method, 'use');
    assert.equal(router.entries[0].args[0], requireAuth);
  });
}

test('/api/comments: DELETE exige sesión; POST de comentarios exige sesión antes de procesar la subida', () => {
  const { productCommentRoutes, commentRoutes } = loadRoutes('../src/routes/comments.routes');
  const deps = { db: fakeDb, uploads: {} };

  const del = commentRoutes(deps).entries.find((e) => e.method === 'delete');
  assert.equal(del.args[1], requireAuth);

  const entries = productCommentRoutes(deps).entries;
  const post = entries.find((e) => e.method === 'post');
  assert.equal(post.args[1], requireAuth);   // 1.º sesión
  assert.equal(typeof post.args[2], 'function'); // 2.º subida
  const get = entries.find((e) => e.method === 'get');
  assert.ok(!get.args.includes(requireAuth)); // leer comentarios es público
});
