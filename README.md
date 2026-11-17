# CyberShop

Tienda online de tecnología (periféricos, componentes, redes, almacenamiento y hardware)
hecha con Node.js, Express y MySQL: catálogo con buscador y filtros, fichas de producto con
comentarios, registro y login, perfil, carrito, checkout simulado, historial de pedidos y
panel de administración.

> Proyecto de prácticas. Usa únicamente datos ficticios y no lo publiques en Internet.

## Stack

- **Frontend**: HTML/CSS/JavaScript (sin frameworks), Fetch API.
- **Backend**: Node.js + Express.
- **Base de datos**: MySQL/MariaDB (pensado para XAMPP), vía `mysql2`.
- Sin Docker. Sin dependencia de Apache: Express sirve tanto el frontend como la API;
  XAMPP se usa únicamente para el servicio de MySQL.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior.
- [XAMPP](https://www.apachefriends.org/) (o cualquier MySQL/MariaDB accesible) con el
  módulo **MySQL** iniciado. No hace falta iniciar Apache.

## Instalación

1. **Clona el repositorio** e instala las dependencias:

   ```bash
   git clone <url-del-repo>
   cd cybershop
   npm install
   ```

2. **Configura las variables de entorno**: copia `.env.example` a `.env` y ajusta los valores.

   ```bash
   cp .env.example .env
   ```

   Variables principales (ver comentarios en el propio archivo):

   | Variable       | Descripción                                              | Por defecto |
   |----------------|-----------------------------------------------------------|-------------|
   | `HOST`         | `127.0.0.1`, `localhost` o `::1` (o tu IPv4 del aula, ver [Acceso desde la red del aula](#acceso-desde-la-red-del-aula)). | `127.0.0.1` |
   | `PORT`         | Puerto HTTP.                                              | `3000`      |
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL/MariaDB. Con XAMPP por defecto: `root` sin contraseña, puerto `3306`. | — |
   | `LAB_LAN_ENABLED` | `true` permite conexiones desde la red del aula. | `false` |
   | `LAB_ALLOWED_CLIENTS` | IPs o subredes (CIDR, mínimo `/16`) que pueden conectarse, separadas por comas. | — |
   | `SESSION_SECRET` | Cadena aleatoria larga para firmar la cookie de sesión. Genera una con el comando de abajo. | — |

   Para generar un `SESSION_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. **Arranca MySQL desde XAMPP** (panel de control de XAMPP → módulo *MySQL* → *Start*).

4. **Inicializa la base de datos** (crea la base de datos, las tablas y los datos de
   ejemplo; es idempotente, puedes volver a ejecutarlo sin duplicar nada):

   ```bash
   npm run init-db
   ```

   Si alguna vez quieres partir de cero (⚠️ **borra todos los datos**):

   ```bash
   npm run reset-db
   ```

   Para comprobar la conexión con MySQL en cualquier momento:

   ```bash
   npm run check-db
   ```

5. **Arranca el servidor**:

   ```bash
   npm start
   ```

   o, en desarrollo, con reinicio automático al guardar cambios:

   ```bash
   npm run dev
   ```

6. Abre `http://127.0.0.1:3000` (o el `HOST`/`PORT` que hayas configurado).

### Usuarios de prueba

`npm run init-db` crea estas cuentas ficticias (no reutilices estas contraseñas en ningún
sitio real):

| Usuario | Contraseña | Rol   |
|---------|------------|-------|
| `admin` | `admin123` | admin |
| `alice` | `alice123` | user  |
| `bob`   | `bob123`   | user  |

## Acceso desde la red del aula

Por defecto la web solo acepta conexiones desde tu propio equipo. Para que otros equipos
del aula (profesor, compañeros) puedan entrar estando en la misma red por cable:

1. Averigua tu IP y la subred del aula (interfaz del cable, p. ej. `eno1`):

   ```bash
   ip -4 -br addr show
   ```

   Ejemplo: `eno1  UP  172.29.230.189/25` → tu IP es `172.29.230.189` y la subred del aula
   es `172.29.230.128/25` (de `.129` a `.254`). La IP la asigna el DHCP del aula, así que
   compruébala cada día.

2. Edita `.env`:

   ```
   HOST=172.29.230.189
   LAB_LAN_ENABLED=true
   LAB_ALLOWED_CLIENTS=172.29.230.128/25
   ```

   Para restringir más, pon solo las IPs concretas: `LAB_ALLOWED_CLIENTS=172.29.230.140,172.29.230.141`.

   Reglas: `HOST` debe ser una IPv4 concreta (nunca `0.0.0.0`), `LAB_ALLOWED_CLIENTS` es
   obligatorio y no admite subredes más amplias que `/16`. Cualquier IP fuera de la lista
   recibe `403`. MySQL sigue escuchando solo en `127.0.0.1`.

3. (Recomendado) Abre el puerto solo para el aula en el cortafuegos (Linux con `ufw`):

   ```bash
   sudo ufw allow from 172.29.230.128/25 to any port 3000 proto tcp
   ```

4. Arranca con `npm start`. La consola muestra los clientes permitidos. Desde los otros
   equipos se entra en `http://172.29.230.189:3000`.

**Al terminar:** vuelve a `LAB_LAN_ENABLED=false` y `HOST=127.0.0.1`, reinicia el servidor y
borra la regla del cortafuegos:

```bash
sudo ufw delete allow from 172.29.230.128/25 to any port 3000 proto tcp
```

## Documentación

- **[`docs/API.md`](docs/API.md)** — rutas de la API.

## Pruebas automatizadas

```bash
npm test
```

Ejecuta la batería de pruebas con el test runner integrado de Node (`node --test`):
controladores, modelos, validadores y middlewares, sin necesitar una base de datos real.

## Estructura del proyecto

```
cybershop/
├── database/            # schema.sql y semillas (database/seed/*.sql)
├── docs/                # Documentación de la API
├── public/              # Frontend (HTML/CSS/JS), servido por Express
├── scripts/             # init-db.js, check-db.js
├── src/
│   ├── app.js           # Fábrica de la aplicación Express
│   ├── config/          # Variables de entorno y pool de MySQL
│   ├── controllers/     # Lógica de cada ruta
│   ├── middleware/      # Sesión, autenticación, subida de archivos, errores, acceso por IP
│   ├── models/          # Acceso a datos
│   ├── routes/          # Registro de rutas de la API
│   ├── services/        # Contraseñas, sesiones, precios, subida de imágenes
│   ├── session/         # Almacén de sesiones en MySQL
│   ├── utils/           # Utilidades (errores HTTP, paginación, IPs)
│   └── validators/      # Validación de entrada
├── tests/               # Pruebas (node:test)
├── server.js            # Punto de entrada
├── .env.example
└── .gitignore
```

## Configuración y secretos

Las credenciales de base de datos y el secreto de sesión viven solo en `.env` (no
versionado, ver `.gitignore`) y se leen con `dotenv`. Las contraseñas de los usuarios se
guardan con `bcrypt`.

## Licencia

Proyecto educativo/privado (`UNLICENSED`, ver `package.json`).
