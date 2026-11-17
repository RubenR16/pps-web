'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createProfileController } = require('../controllers/profile.controller');

function profileRoutes({ userModel, passwordService }) {
  const router = express.Router();
  const controller = createProfileController({ userModel, passwordService });

  router.use(requireAuth);
  router.get('/', controller.get);                     // GET /api/profile
  router.put('/', controller.update);                  // PUT /api/profile           datos personales
  router.put('/password', controller.changePassword);  // PUT /api/profile/password  {current_password,new_password}
  router.get('/email', controller.changeEmail);        // GET /api/profile/email?email=  cambio rápido de email

  return router;
}

module.exports = { profileRoutes };
