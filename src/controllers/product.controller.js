'use strict';

const { parseProductQuery, parseId } = require('../validators/product.validator');

function createProductController(model) {
  return {
    async list(req, res, next) {
      try {
        const result = await model.list(parseProductQuery(req.query));
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async getOne(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de producto inválido.' });

        const product = await model.findById(id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
        return res.json(product);
      } catch (err) {
        return next(err);
      }
    },
  };
}

module.exports = { createProductController };
