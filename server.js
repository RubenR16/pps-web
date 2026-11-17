'use strict';

const crypto = require('crypto');
const session = require('express-session');
const config = require('./src/config');
const { createDb } = require('./src/config/db');
const { createApp } = require('./src/app');
const createSessionStore = require('./src/session/mysqlSessionStore');

async function main() {
  const db = createDb(config.db);

  try {
    const info = await db.testConnection();
    console.log(`[db] Conectado a MySQL/MariaDB ${info.version} (base de datos "${info.db}")`);
  } catch (err) {
    console.error('\n[db] No se pudo conectar con MySQL.');
    console.error(`     Motivo: ${err.code || ''} ${err.message}`);
    console.error('     1) Abre XAMPP y pulsa "Start" en el módulo MySQL.');
    console.error('     2) Revisa DB_HOST, DB_PORT, DB_USER y DB_PASSWORD en tu archivo .env.');
    console.error('     3) Si no has creado las tablas, ejecuta: npm run init-db\n');
    process.exit(1);
  }

  let sessionSecret = config.sessionSecret;
  if (!sessionSecret) {
    sessionSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[session] SESSION_SECRET no está definido en .env: se usa uno aleatorio temporal');
    console.warn('          (las sesiones se perderán al reiniciar). Genera uno fijo con:');
    console.warn('          node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }

  const SessionStore = createSessionStore(session);
  const sessionStore = new SessionStore(db);
  await sessionStore.init();

  const app = createApp({ config, db, sessionStore, sessionSecret });
  const server = app.listen(config.port, config.host, () => {
    console.log('==============================================');
    console.log(' CyberShop');
    console.log(` URL:   http://${config.host}:${config.port}`);
    if (config.lab.lanEnabled) {
      console.log(` Red del aula activa. Clientes permitidos: localhost, ${config.lab.allowedClients.map((r) => r.text).join(', ')}`);
      console.log(' Al terminar: LAB_LAN_ENABLED=false y HOST=127.0.0.1 en .env.');
    } else {
      console.log(' Solo accesible desde este equipo (localhost).');
    }
    console.log('==============================================');
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} recibido, cerrando...`);
    server.close(async () => {
      sessionStore.close();
      await db.close().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
