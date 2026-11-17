'use strict';

const { validateCheckout, validateOrderItems, PAYMENT_METHODS } = require('../validators/order.validator');
const { parseId } = require('../validators/product.validator');
const { respondError } = require('../utils/httpError');

function createOrderController({ orderModel }) {
  return {
    async list(req, res, next) {
      try {
        res.json({ items: await orderModel.listByUser(req.user.id) });
      } catch (err) { next(err); }
    },

    async getOne(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de pedido inválido.' });

        const order = await orderModel.findById(id);
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
        return res.json({ order });
      } catch (err) { return next(err); }
    },

    /** Checkout: recibe los artículos del carrito (con su precio) y los datos de envío. */
    async create(req, res, next) {
      try {
        const body = req.body || {};
        const { errors, value } = validateCheckout(body);
        const { errors: itemErrors, items } = validateOrderItems(body.items);
        Object.assign(errors, itemErrors);
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        const status = PAYMENT_METHODS[value.payment_method];
        const orderId = await orderModel.create(req.user.id, items, value, status);
        const order = await orderModel.findById(orderId);
        return res.status(201).json({ order });
      } catch (err) { return respondError(err, res, next); }
    },
  };
}

module.exports = { createOrderController };
