'use strict';

/**
 * Carga req.user a partir de la sesión. El usuario se lee de la base de datos en cada
 * petición, así un cambio de rol o una cuenta desactivada surten efecto de inmediato.
 */
function attachUser(userModel) {
  return async function attachUserMiddleware(req, res, next) {
    req.user = null;
    const userId = req.session && req.session.userId;
    if (!userId) return next();

    try {
      const user = await userModel.findById(userId);
      if (user && user.is_active) req.user = user;
      else delete req.session.userId; // usuario borrado o desactivado: se cierra la sesión
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  return next();
}

/** Exige uno de los roles indicados. */
function requireRole(...roles) {
  return function requireRoleMiddleware(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    return next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
