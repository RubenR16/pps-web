'use strict';

const { isLoopback, matchesAllowlist, LOOPBACK_ADDRESSES } = require('../utils/ipAllowlist');

/**
 * Restricción de red del laboratorio: solo se aceptan peticiones desde este equipo
 * y, si LAB_LAN_ENABLED está activo, desde las IPs/subredes de LAB_ALLOWED_CLIENTS.
 * Al resto se le responde 403. Se usa la IP del socket, no cabeceras como X-Forwarded-For.
 */
function clientAllowlist(config) {
  const lan = config.lab && config.lab.lanEnabled ? config.lab.allowedClients : [];

  return function clientAllowlistMiddleware(req, res, next) {
    const addr = req.socket.remoteAddress;
    if (isLoopback(addr)) return next();
    if (lan.length > 0 && matchesAllowlist(addr, lan)) return next();
    return res.status(403).json({ error: 'Acceso no permitido desde esta IP.' });
  };
}

module.exports = { clientAllowlist, LOOPBACK_ADDRESSES };
