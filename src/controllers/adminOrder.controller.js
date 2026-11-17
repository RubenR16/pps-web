'use strict';

const { validateOrderStatus, parseStatusFilter } = require('../validators/admin.validator');
const { parseId } = require('../validators/product.validator');
const { parsePagination, paged } = require('../utils/pagination');
const { respondError } = require('../utils/httpError');

function createAdminOrderController({ model }) {
  return {
    async list(req, res, next) {
      try {
        const pagination = parsePagination(req.query);
        const { items, total } = await model.list({ status: parseStatusFilter(req.query), ...pagination });
        res.json(paged(items, total, pagination));
      } catch (err) { next(err); }
    },

    async getOne(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de pedido inválido.' });
        const order = await model.findById(id);
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
        return res.json({ order });
      } catch (err) { return next(err); }
    },

    async updateStatus(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de pedido inválido.' });
        const { errors, value } = validateOrderStatus(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: errors.status, fields: errors });

        await model.updateStatus(id, value.status);
        return res.json({ order: await model.findById(id) });
      } catch (err) { return respondError(err, res, next); }
    },
  };
}

module.exports = { createAdminOrderController };
