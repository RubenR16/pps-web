'use strict';

const express = require('express');
const { requireRole } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { createAdminProductModel } = require('../models/adminProduct.model');
const { createAdminUserModel } = require('../models/adminUser.model');
const { createAdminOrderModel } = require('../models/adminOrder.model');
const { createStatsModel } = require('../models/stats.model');
const { createAdminProductController } = require('../controllers/adminProduct.controller');
const { createAdminUserController } = require('../controllers/adminUser.controller');
const { createAdminOrderController } = require('../controllers/adminOrder.controller');
const { createStatsController } = require('../controllers/stats.controller');

function adminRoutes({ db, userModel, uploads }) {
  const router = express.Router();
  const products = createAdminProductController({ model: createAdminProductModel(db), uploads });
  const users = createAdminUserController({ model: createAdminUserModel(db), userModel });
  const orders = createAdminOrderController({ model: createAdminOrderModel(db) });
  const stats = createStatsController({ model: createStatsModel(db) });
  const requireImage = imageUpload({ required: true });

  // Todo lo que cuelga de /api/admin es solo para administradores.
  router.use(requireRole('admin'));

  router.get('/stats', stats.overview);                       // GET    /api/admin/stats

  router.get('/products', products.list);                     // GET    /api/admin/products?search&page&limit
  router.post('/products', products.create);                  // POST   /api/admin/products
  router.get('/products/:id', products.getOne);               // GET    /api/admin/products/:id
  router.put('/products/:id', products.update);               // PUT    /api/admin/products/:id
  router.delete('/products/:id', products.remove);            // DELETE /api/admin/products/:id
  router.post('/products/:id/image', requireImage, products.uploadImage); // multipart, campo "image"
  router.delete('/products/:id/image', products.removeImage); // DELETE /api/admin/products/:id/image

  router.get('/users', users.list);                           // GET    /api/admin/users?search&page&limit
  router.put('/users/:id', users.update);                     // PUT    /api/admin/users/:id  {role?, is_active?}

  router.get('/orders', orders.list);                         // GET    /api/admin/orders?status&page&limit
  router.get('/orders/:id', orders.getOne);                   // GET    /api/admin/orders/:id
  router.put('/orders/:id/status', orders.updateStatus);      // PUT    /api/admin/orders/:id/status {status}

  return router;
}

module.exports = { adminRoutes };
