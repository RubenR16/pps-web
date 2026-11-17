'use strict';

const { validateRegister, validateLogin } = require('../validators/auth.validator');
const { startSession, destroySession } = require('../services/session.service');
const { SESSION_COOKIE } = require('../middleware/session');

const INVALID_DATA = 'Datos no válidos.';

function createAuthController({ userModel, passwordService }) {
  return {
    async register(req, res, next) {
      try {
        const { errors, value } = validateRegister(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: INVALID_DATA, fields: errors });

        const taken = await userModel.findTaken({ username: value.username, email: value.email });
        if (taken.username || taken.email) {
          const fields = {};
          if (taken.username) fields.username = 'Ese nombre de usuario ya está en uso.';
          if (taken.email) fields.email = 'Ese email ya está registrado.';
          return res.status(409).json({ error: 'El usuario o el email ya existen.', fields });
        }

        const passwordHash = await passwordService.hash(value.password);
        let id;
        try {
          id = await userModel.create({ ...req.body, ...value, passwordHash });
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El usuario o el email ya existen.' });
          throw err;
        }

        await startSession(req, id);
        return res.status(201).json({ user: await userModel.findById(id) });
      } catch (err) {
        return next(err);
      }
    },

    async login(req, res, next) {
      try {
        const { errors, value } = validateLogin(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: INVALID_DATA, fields: errors });

        const row = await userModel.findAuthByIdentifier(value.identifier);
        if (!row) return res.status(401).json({ error: 'Ese usuario no existe.' });

        const valid = await passwordService.compare(value.password, row.password_hash);
        if (!valid) return res.status(401).json({ error: 'La contraseña es incorrecta.' });
        if (!row.is_active) return res.status(401).json({ error: 'Esta cuenta está desactivada.' });

        await startSession(req, row.id);
        return res.json({ user: await userModel.findById(row.id) });
      } catch (err) {
        return next(err);
      }
    },

    async logout(req, res, next) {
      try {
        await destroySession(req);
        res.clearCookie(SESSION_COOKIE);
        return res.json({ ok: true });
      } catch (err) {
        return next(err);
      }
    },

    me(req, res) {
      res.json({ user: req.user || null });
    },
  };
}

module.exports = { createAuthController };
