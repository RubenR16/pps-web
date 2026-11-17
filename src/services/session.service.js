'use strict';

function viaCallback(fn) {
  return new Promise((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));
}

/** Guarda el usuario en la sesión actual. */
async function startSession(req, userId) {
  req.session.userId = userId;
  await viaCallback((cb) => req.session.save(cb));
}

function destroySession(req) {
  return viaCallback((cb) => req.session.destroy(cb));
}

module.exports = { startSession, destroySession };
