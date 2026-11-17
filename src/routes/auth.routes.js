'use strict';

const express = require('express');
const { createAuthController } = require('../controllers/auth.controller');

function authRoutes({ userModel, passwordService }) {
  const router = express.Router();
  const controller = createAuthController({ userModel, passwordService });

  router.post('/register', controller.register); // POST /api/auth/register  {username,email,password,full_name?}
  router.post('/login', controller.login);       // POST /api/auth/login     {identifier,password}
  router.post('/logout', controller.logout);     // POST /api/auth/logout
  router.get('/me', controller.me);              // GET  /api/auth/me        -> {user|null}

  return router;
}

module.exports = { authRoutes };
