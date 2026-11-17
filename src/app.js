'use strict';

const path = require('path');
const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const { apiRouter } = require('./routes');
const { createSessionMiddleware } = require('./middleware/session');
const { clientAllowlist } = require('./middleware/clientAllowlist');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Fábrica de la aplicación Express. Recibe config y db por parámetro (sin globales)
 * para poder crear instancias de prueba.
 */
function createApp({ config, db, sessionStore, sessionSecret }) {
  const app = express();

  app.use(clientAllowlist(config));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  const sessions = createSessionMiddleware({
    store: sessionStore || new session.MemoryStore(),
    secret: sessionSecret || config.sessionSecret || crypto.randomBytes(32).toString('hex'),
  });

  app.use('/api', sessions, apiRouter({ config, db }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(notFound);
  app.use(errorHandler());

  return app;
}

module.exports = { createApp };
