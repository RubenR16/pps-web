'use strict';

/**
 * Inicializa la base de datos de CyberShop:
 *   1. Crea la base de datos (DB_NAME) si no existe.
 *   2. Ejecuta database/schema.sql.
 *   3. Ejecuta los scripts de database/seed/*.sql en orden alfabético.
 *   4. Inserta los usuarios ficticios (contraseñas hasheadas con bcrypt).
 *
 * Uso:  npm run init-db           (idempotente)
 *       npm run reset-db          (BORRA la base de datos y la recrea)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const config = require('../src/config');

// Usuarios FICTICIOS del laboratorio. No uses estas contraseñas en ningún sitio real.
const SEED_USERS = [
  { username: 'admin', email: 'admin@cybershop.local', password: 'admin123', full_name: 'Administrador CyberShop', role: 'admin' },
  { username: 'alice', email: 'alice@cybershop.local', password: 'alice123', full_name: 'Alice Martín', role: 'user',
    address: 'Calle Falsa 123', city: 'Valencia', postal_code: '46001', country: 'España', phone: '600111222' },
  { username: 'bob', email: 'bob@cybershop.local', password: 'bob123', full_name: 'Bob Sánchez', role: 'user',
    address: 'Avenida del Lab 45', city: 'Madrid', postal_code: '28001', country: 'España', phone: '600333444' },
];

async function main() {
  const reset = process.argv.includes('--reset');
  const { host, port, user, password, database } = config.db;

  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true, charset: 'utf8mb4' });
  try {
    if (reset) {
      console.log(`[init-db] Eliminando base de datos "${database}"...`);
      await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
    }
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);
    console.log(`[init-db] Base de datos "${database}" lista.`);

    const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    await conn.query(schema);
    console.log('[init-db] Esquema aplicado.');

    const seedDir = path.join(__dirname, '..', 'database', 'seed');
    const files = fs.readdirSync(seedDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      await conn.query(fs.readFileSync(path.join(seedDir, file), 'utf8'));
      console.log(`[init-db] Seed aplicado: ${file}`);
    }

    for (const u of SEED_USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      await conn.query(
        `INSERT IGNORE INTO users
           (username, email, password_hash, full_name, phone, address, city, postal_code, country, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.username, u.email, hash, u.full_name, u.phone || null, u.address || null,
         u.city || null, u.postal_code || null, u.country || null, u.role]
      );
    }
    console.log(`[init-db] Usuarios ficticios listos: ${SEED_USERS.map((u) => u.username).join(', ')}`);
    console.log('[init-db] Terminado correctamente.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[init-db] Error:', err.code || '', err.message);
  console.error('          ¿Está MySQL iniciado en XAMPP y son correctas las credenciales de .env?');
  process.exit(1);
});
