'use strict';

const express = require('express');
const { createProductModel } = require('../models/product.model');
const { createProductController } = require('../controllers/product.controller');

function productRoutes({ db }) {
  const router = express.Router();
  const controller = createProductController(createProductModel(db));

  router.get('/', controller.list);      // GET /api/products?search=&category=&sort=&page=&limit=&featured=&exclude=
  router.get('/:id', controller.getOne); // GET /api/products/:id

  return router;
}

module.exports = { productRoutes };
