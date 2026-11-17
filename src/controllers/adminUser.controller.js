'use strict';

const { validateUserUpdate } = require('../validators/admin.validator');
const { parseId } = require('../validators/product.validator');
const { parsePagination, paged, parseSearch } = require('../utils/pagination');

function createAdminUserController({ model, userModel }) {
  return {
    async list(req, res, next) {
      try {
        const pagination = parsePagination(req.query);
        const { items, total } = await model.list({ search: parseSearch(req.query), ...pagination });
        res.json(paged(items, total, pagination));
      } catch (err) { next(err); }
    },

    async update(req, res, next) {
      try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Identificador de usuario inválido.' });

        // Solo role e is_active: el resto de campos del cuerpo se ignora.
        const { errors, value } = validateUserUpdate(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: Object.values(errors)[0], fields: errors });

        const target = await userModel.findById(id);
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });

        // Evita que un administrador se bloquee a sí mismo fuera del panel.
        if (target.id === req.user.id && (value.role === 'user' || value.is_active === false)) {
          return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador ni desactivar tu cuenta.' });
        }

        await model.updateAccess(id, value);
        return res.json({ user: await userModel.findById(id) });
      } catch (err) { return next(err); }
    },
  };
}

module.exports = { createAdminUserController };
