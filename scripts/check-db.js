'use strict';

/** Comprueba la conexión con MySQL y muestra las tablas y su número de filas. */

const config = require('../src/config');
const { createDb } = require('../src/config/db');

async function main() {
  const db = createDb(config.db);
  try {
    const info = await db.testConnection();
    console.log(`Conexión OK -> MySQL/MariaDB ${info.version}, base de datos "${info.db}"`);

    const tables = await db.execute(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
      [config.db.database]
    );
    if (tables.length === 0) {
      console.log('No hay tablas. Ejecuta: npm run init-db');
      return;
    }
    for (const { name } of tables) {
      const [{ total }] = await db.execute(`SELECT COUNT(*) AS total FROM \`${name}\``);
      console.log(` - ${name.padEnd(14)} ${total} filas`);
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('Conexión FALLIDA:', err.code || '', err.message);
  process.exit(1);
});
