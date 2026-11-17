'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createOrderModel } = require('../models/order.model');
const { createOrderController } = require('../controllers/order.controller');

function orderRoutes({ db }) {
  const router = express.Router();
  const controller = createOrderController({ orderModel: createOrderModel(db) });

  router.use(requireAuth);
  router.get('/', controller.list);     // GET  /api/orders      historial del usuario
  router.get('/:id', controller.getOne);// GET  /api/orders/:id  detalle del pedido
  router.post('/', controller.create);  // POST /api/orders      checkout simulado {items, datos de envío}

  return router;
}

module.exports = { orderRoutes };
