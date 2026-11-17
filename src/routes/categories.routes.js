'use strict';

const express = require('express');
const { createCategoryModel } = require('../models/category.model');
const { createCategoryController } = require('../controllers/category.controller');

function categoryRoutes({ db }) {
  const router = express.Router();
  const controller = createCategoryController(createCategoryModel(db));

  router.get('/', controller.list); // GET /api/categories

  return router;
}

module.exports = { categoryRoutes };
