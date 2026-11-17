'use strict';

const { validateProduct } = require('../validators/admin.validator');
const { parseId } = require('../validators/product.validator');
const { parsePagination, paged, parseSearch } = require('../utils/pagination');
const { respondError } = require('../utils/httpError');

const BAD_CATEGORY = { error: 'La categoría indicada no existe.', fields: { category_id: 'La categoría indicada no existe.' } };

function createAdminProductController({ model, uploads }) {
  return {
    async list(req, res, next) {
      try {
        const pagination = parsePagination(req.query);
        const { items, total } = await model.list({ search: parseSearch(req.query), ...pagination });
        res.json(paged(items, total, pagination));
      } catch (err) { next(err); }
    },

    async getOne(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        const product = await model.findById(id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
        return res.json({ product });
      } catch (err) { return next(err); }
    },

    async create(req, res, next) {
      try {
        const { errors, value } = validateProduct(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        let id;
        try {
          id = await model.create(value);
        } catch (err) {
          if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json(BAD_CATEGORY);
          throw err;
        }
        return res.status(201).json({ product: await model.findById(id) });
      } catch (err) { return next(err); }
    },

    async update(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        if (!(await model.findById(id))) return res.status(404).json({ error: 'Producto no encontrado.' });

        const { errors, value } = validateProduct(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        try {
          await model.update(id, value);
        } catch (err) {
          if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json(BAD_CATEGORY);
          throw err;
        }
        return res.json({ product: await model.findById(id) });
      } catch (err) { return next(err); }
    },

    async remove(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        const product = await model.findById(id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

        await model.remove(id);
        if (product.image) await uploads.remove(product.image).catch(() => {});
        return res.json({ ok: true });
      } catch (err) { return next(err); }
    },

    async uploadImage(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        const product = await model.findById(id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

        const url = await uploads.saveImage(req.file.buffer, 'products', req.file.originalname);
        try {
          await model.setImage(id, url);
        } catch (err) {
          await uploads.remove(url).catch(() => {}); // no dejar archivos huérfanos
          throw err;
        }
        if (product.image && product.image !== url) await uploads.remove(product.image).catch(() => {});
        return res.json({ product: await model.findById(id) });
      } catch (err) { return respondError(err, res, next); }
    },

    async removeImage(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        const product = await model.findById(id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

        await model.setImage(id, null);
        if (product.image) await uploads.remove(product.image).catch(() => {});
        return res.json({ product: await model.findById(id) });
      } catch (err) { return next(err); }
    },
  };
}

module.exports = { createAdminProductController };
