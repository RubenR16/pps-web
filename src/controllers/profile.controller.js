'use strict';

const { validateProfile, validatePasswordChange, EMAIL_RE } = require('../validators/auth.validator');

function createProfileController({ userModel, passwordService }) {
  return {
    get(req, res) {
      res.json({ user: req.user });
    },

    async update(req, res, next) {
      try {
        const { errors, value } = validateProfile(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        const taken = await userModel.findTaken({ email: value.email, excludeId: req.user.id });
        if (taken.email) {
          return res.status(409).json({ error: 'Ese email ya está en uso.', fields: { email: 'Ese email ya está en uso.' } });
        }

        try {
          await userModel.updateProfile(req.user.id, value);
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ese email ya está en uso.', fields: { email: 'Ese email ya está en uso.' } });
          }
          throw err;
        }
        return res.json({ user: await userModel.findById(req.user.id) });
      } catch (err) {
        return next(err);
      }
    },

    /** GET /api/profile/email?email=  -> cambia solo el email del usuario. */
    async changeEmail(req, res, next) {
      try {
        const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
        if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email no válido.' });

        const taken = await userModel.findTaken({ email, excludeId: req.user.id });
        if (taken.email) return res.status(409).json({ error: 'Ese email ya está en uso.' });

        await userModel.updateEmail(req.user.id, email);
        return res.json({ ok: true, email });
      } catch (err) {
        return next(err);
      }
    },

    async changePassword(req, res, next) {
      try {
        const { errors, value } = validatePasswordChange(req.body || {});
        if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos no válidos.', fields: errors });

        const storedHash = await userModel.getPasswordHash(req.user.id);
        const matches = storedHash ? await passwordService.compare(value.current_password, storedHash) : false;
        if (!matches) {
          return res.status(400).json({
            error: 'La contraseña actual no es correcta.',
            fields: { current_password: 'La contraseña actual no es correcta.' },
          });
        }

        await userModel.updatePassword(req.user.id, await passwordService.hash(value.new_password));
        return res.json({ ok: true });
      } catch (err) {
        return next(err);
      }
    },
  };
}

module.exports = { createProfileController };
