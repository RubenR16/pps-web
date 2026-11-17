'use strict';

/** Utilidades compartidas por las pruebas (no es un test: no termina en .test.js). */

function mockRes() {
  return {
    statusCode: 200, body: null, headers: {}, clearedCookie: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    set(key, value) { this.headers[key] = value; return this; },
    clearCookie(name) { this.clearedCookie = name; return this; },
  };
}

function mockReq(body = {}, extra = {}) {
  const session = {
    regenerated: false, destroyed: false,
    regenerate(cb) { this.regenerated = true; cb(); },
    save(cb) { cb(); },
    destroy(cb) { this.destroyed = true; cb(); },
  };
  return { body, ip: '203.0.113.9', session, user: null, ...extra };
}

/** Servicio de contraseñas simulado (no necesita bcrypt instalado). */
function fakePasswordService() {
  return {
    hash: async (plain) => `hash:${plain}`,
    compare: async (plain, hash) => hash === `hash:${plain}`,
  };
}

module.exports = { mockRes, mockReq, fakePasswordService };
