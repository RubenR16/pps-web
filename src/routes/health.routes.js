'use strict';

const express = require('express');

function healthRoutes({ db }) {
  const router = express.Router();

  // GET /api/health -> estado del servidor y de la conexión MySQL.
  router.get('/', async (req, res) => {
    let database;
    try {
      const info = await db.testConnection();
      database = { status: 'up', name: info.db, version: info.version };
    } catch (err) {
      database = { status: 'down', error: err.message };
    }
    res.status(database.status === 'up' ? 200 : 503).json({
      status: database.status === 'up' ? 'ok' : 'degraded',
      app: 'CyberShop',
      database,
      time: new Date().toISOString(),
    });
  });

  return router;
}

module.exports = { healthRoutes };
