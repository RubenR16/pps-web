'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createCartModel } = require('../models/cart.model');
const { createProductModel } = require('../models/product.model');
const { createCartController } = require('../controllers/cart.controller');

function cartRoutes({ db }) {
  const router = express.Router();
  const controller = createCartController({ cartModel: createCartModel(db), productModel: createProductModel(db) });

  router.use(requireAuth);
  router.get('/', controller.get);                          // GET    /api/cart
  router.get('/summary', controller.summary);               // GET    /api/cart/summary   -> {item_count}
  router.post('/items', controller.addItem);                // POST   /api/cart/items     {product_id, quantity?}
  router.put('/items/:productId', controller.updateItem);   // PUT    /api/cart/items/:productId {quantity}
  router.delete('/items/:productId', controller.removeItem);// DELETE /api/cart/items/:productId
  router.delete('/', controller.clear);                     // DELETE /api/cart

  return router;
}

module.exports = { cartRoutes };
