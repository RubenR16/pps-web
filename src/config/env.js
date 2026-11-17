'use strict';

/**
 * Lectura y validación de la configuración a partir de variables de entorno.
 * Es una función pura (no toca el disco ni la red) para poder probarla fácilmente.
 */

const { parseAllowlist, isValidIpv4 } = require('../utils/ipAllowlist');

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const WILDCARD_HOSTS = ['0.0.0.0', '::'];

function parseIntStrict(value, name, { min, max }) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`Configuración inválida: ${name} debe ser un entero entre ${min} y ${max} (valor: "${value}").`);
  }
  return n;
}

function parseBool(value, name) {
  const v = String(value === undefined ? 'false' : value).trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false' || v === '') return false;
  throw new Error(`Configuración inválida: ${name} debe ser "true" o "false" (valor: "${value}").`);
}

function loadConfig(env = process.env) {
  const host = String(env.HOST || '127.0.0.1').trim();

  // Acceso desde la red del aula: hay que activarlo explícitamente y siempre va
  // acompañado de una lista de IPs/subredes permitidas.
  const lanEnabled = parseBool(env.LAB_LAN_ENABLED, 'LAB_LAN_ENABLED');
  const allowedClients = Object.freeze(parseAllowlist(env.LAB_ALLOWED_CLIENTS));
  if (lanEnabled && allowedClients.length === 0) {
    throw new Error(
      'Configuración inválida: LAB_LAN_ENABLED=true exige LAB_ALLOWED_CLIENTS ' +
        '(subred del aula, p. ej. 172.29.230.128/25, o IPs concretas separadas por comas).'
    );
  }

  if (!LOOPBACK_HOSTS.includes(host)) {
    if (!lanEnabled) {
      throw new Error(
        'Configuración inválida: HOST debe ser 127.0.0.1, localhost o ::1. ' +
          'Para abrir la web a la red del aula activa LAB_LAN_ENABLED=true y LAB_ALLOWED_CLIENTS.'
      );
    }
    if (WILDCARD_HOSTS.includes(host) || !isValidIpv4(host)) {
      throw new Error(
        'Configuración inválida: con LAB_LAN_ENABLED, HOST debe ser la IPv4 concreta de tu tarjeta de red ' +
          `(p. ej. 172.29.230.189), nunca 0.0.0.0 ni un nombre (valor: "${host}").`
      );
    }
  }

  const dbName = String(env.DB_NAME || 'cybershop').trim();
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error('Configuración inválida: DB_NAME solo admite letras, números y guion bajo.');
  }

  return Object.freeze({
    host,
    port: parseIntStrict(env.PORT || '3000', 'PORT', { min: 1, max: 65535 }),
    db: Object.freeze({
      host: String(env.DB_HOST || '127.0.0.1'),
      port: parseIntStrict(env.DB_PORT || '3306', 'DB_PORT', { min: 1, max: 65535 }),
      user: String(env.DB_USER || 'root'),
      password: String(env.DB_PASSWORD || ''),
      database: dbName,
      connectionLimit: parseIntStrict(env.DB_CONNECTION_LIMIT || '10', 'DB_CONNECTION_LIMIT', { min: 1, max: 100 }),
    }),
    lab: Object.freeze({
      // Solo tiene efecto real si el servidor escucha fuera de loopback.
      lanEnabled: lanEnabled && !LOOPBACK_HOSTS.includes(host),
      allowedClients,
    }),
    sessionSecret: env.SESSION_SECRET ? String(env.SESSION_SECRET) : null,
  });
}

module.exports = { loadConfig, LOOPBACK_HOSTS, WILDCARD_HOSTS };
