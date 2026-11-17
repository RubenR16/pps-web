'use strict';

const path = require('path');
const express = require('express');
const { healthRoutes } = require('./health.routes');
const { productRoutes } = require('./products.routes');
const { categoryRoutes } = require('./categories.routes');
const { authRoutes } = require('./auth.routes');
const { profileRoutes } = require('./profile.routes');
const { cartRoutes } = require('./cart.routes');
const { orderRoutes } = require('./orders.routes');
const { adminRoutes } = require('./admin.routes');
const { productCommentRoutes, commentRoutes } = require('./comments.routes');
const { createUploadService } = require('../services/upload.service');
const { createUserModel } = require('../models/user.model');
const { createPasswordService } = require('../services/password.service');
const { attachUser } = require('../middleware/auth');

/** Registro central de rutas API. */
function apiRouter(ctx) {
  const userModel = createUserModel(ctx.db);
  const passwordService = createPasswordService();
  const uploads = createUploadService({ baseDir: path.join(__dirname, '..', '..', 'public', 'uploads') });
  const deps = { ...ctx, userModel, passwordService, uploads };

  const router = express.Router();
  router.use('/health', healthRoutes(ctx));

  router.use(attachUser(userModel)); // a partir de aquí req.user está disponible

  router.use('/products/:productId/comments', productCommentRoutes(deps));
  router.use('/products', productRoutes(deps));
  router.use('/categories', categoryRoutes(deps));
  router.use('/auth', authRoutes(deps));
  router.use('/profile', profileRoutes(deps));
  router.use('/cart', cartRoutes(deps));
  router.use('/orders', orderRoutes(deps));
  router.use('/comments', commentRoutes(deps));
  router.use('/admin', adminRoutes(deps));

  return router;
}

module.exports = { apiRouter };
