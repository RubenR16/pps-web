'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { createCommentModel } = require('../models/comment.model');
const { createProductModel } = require('../models/product.model');
const { createCommentController } = require('../controllers/comment.controller');

function makeController({ db, uploads }) {
  return createCommentController({
    commentModel: createCommentModel(db),
    productModel: createProductModel(db),
    uploads,
  });
}

/** Montado en /api/products/:productId/comments */
function productCommentRoutes(deps) {
  const router = express.Router({ mergeParams: true });
  const controller = makeController(deps);

  router.get('/', controller.list);                                                           // público
  router.post('/', requireAuth, imageUpload(), controller.create);      // JSON o multipart

  return router;
}

/** Montado en /api/comments */
function commentRoutes(deps) {
  const router = express.Router();
  const controller = makeController(deps);

  router.delete('/:id', requireAuth, controller.remove); // autor o administrador

  return router;
}

module.exports = { productCommentRoutes, commentRoutes };
