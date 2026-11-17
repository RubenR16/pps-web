'use strict';

const { validateComment } = require('../validators/comment.validator');
const { parseId } = require('../validators/product.validator');
const { respondError } = require('../utils/httpError');

function createCommentController({ commentModel, productModel, uploads }) {
  return {
    /** Público: cualquiera puede leer los comentarios de un producto. */
    async list(req, res, next) {
      try {
        const productId = parseId(req.params.productId);
        if (!productId) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        if (!(await productModel.findById(productId))) return res.status(404).json({ error: 'Producto no encontrado.' });
        return res.json({ items: await commentModel.listByProduct(productId) });
      } catch (err) { return next(err); }
    },

    /** Requiere sesión. Acepta JSON o multipart (con imagen opcional en el campo "image"). */
    async create(req, res, next) {
      let imageUrl = null;
      try {
        const productId = parseId(req.params.productId);
        if (!productId) return res.status(400).json({ error: 'Identificador de producto inválido.' });
        if (!(await productModel.findById(productId))) return res.status(404).json({ error: 'Producto no encontrado.' });

        const { errors, value } = validateComment(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        if (req.file) imageUrl = await uploads.saveImage(req.file.buffer, 'comments', req.file.originalname);

        const id = await commentModel.create({ productId, userId: req.user.id, content: value.content, image: imageUrl });
        return res.status(201).json({ comment: await commentModel.findById(id) });
      } catch (err) {
        if (imageUrl) await uploads.remove(imageUrl).catch(() => {});
        return respondError(err, res, next);
      }
    },

    /** Solo el autor o un administrador pueden borrar un comentario. */
    async remove(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de comentario inválido.' });

        const comment = await commentModel.findById(id);
        if (!comment) return res.status(404).json({ error: 'Comentario no encontrado.' });
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ error: 'No puedes borrar este comentario.' });
        }

        await commentModel.remove(id);
        if (comment.image) await uploads.remove(comment.image).catch(() => {});
        return res.json({ ok: true });
      } catch (err) { return next(err); }
    },
  };
}

module.exports = { createCommentController };
