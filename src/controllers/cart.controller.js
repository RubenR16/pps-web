'use strict';

const { validateAddItem, validateQuantity, MAX_PER_ITEM } = require('../validators/cart.validator');
const { buildCartView } = require('../services/cart.service');
const { HttpError, respondError } = require('../utils/httpError');

function createCartController({ cartModel, productModel }) {
  async function view(userId) {
    return buildCartView(await cartModel.listItems(userId));
  }

  /** Comprueba el producto y la cantidad total pedida (stock y máximo por producto). */
  async function assertCanHold(productId, totalQuantity) {
    const product = await productModel.findById(productId);
    if (!product) throw new HttpError(404, 'Producto no encontrado.');
    if (product.stock <= 0) throw new HttpError(409, 'Este producto está agotado.');
    if (totalQuantity > MAX_PER_ITEM) throw new HttpError(400, `Máximo ${MAX_PER_ITEM} unidades por producto.`);
    if (totalQuantity > product.stock) throw new HttpError(409, `No hay stock suficiente (quedan ${product.stock}).`);
  }

  return {
    async get(req, res, next) {
      try {
        res.json(await view(req.user.id));
      } catch (err) { next(err); }
    },

    async summary(req, res, next) {
      try {
        res.json({ item_count: await cartModel.countItems(req.user.id) });
      } catch (err) { next(err); }
    },

    async addItem(req, res, next) {
      try {
        const { errors, value } = validateAddItem(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        const current = await cartModel.getQuantity(req.user.id, value.productId);
        await assertCanHold(value.productId, current + value.quantity);
        await cartModel.setQuantity(req.user.id, value.productId, current + value.quantity);
        return res.status(201).json(await view(req.user.id));
      } catch (err) { return respondError(err, res, next); }
    },

    async updateItem(req, res, next) {
      try {
        const productId = Number(req.params.productId);
        if (!Number.isInteger(productId) || productId < 1) return res.status(400).json({ error: 'Producto no válido.' });

        const { errors, value } = validateQuantity(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: errors.quantity, fields: errors });

        if ((await cartModel.getQuantity(req.user.id, productId)) === 0) {
          return res.status(404).json({ error: 'Ese producto no está en tu carrito.' });
        }
        await assertCanHold(productId, value.quantity);
        await cartModel.setQuantity(req.user.id, productId, value.quantity);
        return res.json(await view(req.user.id));
      } catch (err) { return respondError(err, res, next); }
    },

    async removeItem(req, res, next) {
      try {
        const productId = Number(req.params.productId);
        if (!Number.isInteger(productId) || productId < 1) return res.status(400).json({ error: 'Producto no válido.' });
        await cartModel.removeItem(req.user.id, productId);
        return res.json(await view(req.user.id));
      } catch (err) { return next(err); }
    },

    async clear(req, res, next) {
      try {
        await cartModel.clear(req.user.id);
        res.json(await view(req.user.id));
      } catch (err) { next(err); }
    },
  };
}

module.exports = { createCartController };
