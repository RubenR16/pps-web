'use strict';

/**
 * Utilidades puras para la lista de clientes permitidos del "modo clase" (LAN).
 * Solo IPv4: las redes de aula usan IPv4 y así la lógica es sencilla de auditar.
 *
 * Formatos admitidos en LAB_ALLOWED_CLIENTS (separados por comas):
 *   172.29.230.140          -> una IP concreta (equivale a /32)
 *   172.29.230.128/25       -> una subred en notación CIDR
 */

// Una subred más amplia que /16 (65.536 direcciones) ya no es "la red del aula".
const MIN_PREFIX = 16;

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** "172.29.230.189" -> entero sin signo de 32 bits, o null si no es una IPv4 válida. */
function ipv4ToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const octet = Number(p);
    if (octet > 255) return null;
    n = n * 256 + octet;
  }
  return n;
}

function isValidIpv4(ip) {
  return ipv4ToInt(ip) !== null;
}

/** Máscara de red como entero sin signo para un prefijo 0..32. */
function maskFor(prefix) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/**
 * Convierte el texto de LAB_ALLOWED_CLIENTS en una lista de reglas
 * [{ text, network, prefix }]. Lanza un error descriptivo si alguna entrada es inválida.
 */
function parseAllowlist(value) {
  const entries = String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return entries.map((entry) => {
    const [ipPart, prefixPart, extra] = entry.split('/');
    if (extra !== undefined) throw new Error(`LAB_ALLOWED_CLIENTS: entrada inválida "${entry}".`);

    const ipInt = ipv4ToInt(ipPart);
    if (ipInt === null) {
      throw new Error(`LAB_ALLOWED_CLIENTS: "${entry}" no es una IPv4 ni una subred IPv4 válida.`);
    }

    let prefix = 32;
    if (prefixPart !== undefined) {
      if (!/^\d{1,2}$/.test(prefixPart) || Number(prefixPart) > 32) {
        throw new Error(`LAB_ALLOWED_CLIENTS: prefijo inválido en "${entry}" (debe ser /0../32).`);
      }
      prefix = Number(prefixPart);
    }
    if (prefix < MIN_PREFIX) {
      throw new Error(
        `LAB_ALLOWED_CLIENTS: "${entry}" es demasiado amplia. ` +
          `El prefijo mínimo es /${MIN_PREFIX}; usa la subred del aula o IPs concretas.`
      );
    }

    const network = (ipInt & maskFor(prefix)) >>> 0;
    return Object.freeze({ text: entry, network, prefix });
  });
}

/** Normaliza la IP del socket: "::ffff:172.29.230.140" -> "172.29.230.140". */
function normalizeRemoteAddress(addr) {
  const s = String(addr || '');
  return s.startsWith('::ffff:') ? s.slice(7) : s;
}

function isLoopback(addr) {
  return LOOPBACK_ADDRESSES.has(String(addr || ''));
}

/** ¿La IP (ya normalizada o no) pertenece a alguna regla de la lista? */
function matchesAllowlist(addr, rules) {
  const ipInt = ipv4ToInt(normalizeRemoteAddress(addr));
  if (ipInt === null) return false;
  return rules.some((r) => ((ipInt & maskFor(r.prefix)) >>> 0) === r.network);
}

module.exports = {
  MIN_PREFIX,
  LOOPBACK_ADDRESSES,
  isValidIpv4,
  parseAllowlist,
  normalizeRemoteAddress,
  isLoopback,
  matchesAllowlist,
};
