'use strict';

/**
 * Hash y comparación de contraseñas con bcrypt.
 * bcrypt se carga de forma perezosa para poder importar este módulo (y probar los
 * controladores con un servicio simulado) sin tener el binario nativo instalado.
 */
let bcryptLib = null;
function bcrypt() {
  if (!bcryptLib) bcryptLib = require('bcrypt');
  return bcryptLib;
}

const DEFAULT_ROUNDS = 4;

function createPasswordService({ rounds = DEFAULT_ROUNDS } = {}) {
  const hash = (plain) => bcrypt().hash(plain, rounds);
  const compare = (plain, storedHash) => bcrypt().compare(plain, storedHash);
  return { hash, compare };
}

module.exports = { createPasswordService, DEFAULT_ROUNDS };
