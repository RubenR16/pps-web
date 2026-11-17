# CyberShop — Documentación de la API

Todas las rutas cuelgan de `/api`. Las respuestas son JSON (`Content-Type: application/json`). Las rutas marcadas con 🔒 exigen sesión iniciada (cookie de sesión); las marcadas con 🛠 exigen además rol `admin`.

## Salud

| Método | Ruta          | Descripción                        |
|--------|---------------|-------------------------------------|
| GET    | `/api/health` | Estado del servidor y de la conexión con la base de datos. |

## Autenticación (`/api/auth`)

| Método | Ruta             | Descripción                                                   |
|--------|------------------|----------------------------------------------------------------|
| POST   | `/auth/register` | Crea una cuenta e inicia sesión. Body: `{ username, email, password, full_name? }`. |
| POST   | `/auth/login`    | Inicia sesión. Body: `{ identifier, password }` (`identifier` = usuario o email). |
| POST   | `/auth/logout`   | Cierra la sesión actual.                                       |
| GET    | `/auth/me`       | Devuelve `{ user }` (o `{ user: null }`) según la sesión.       |

## Perfil (`/api/profile`) 🔒

| Método | Ruta               | Descripción                                            |
|--------|--------------------|----------------------------------------------------------|
| GET    | `/profile`         | Datos del usuario autenticado.                           |
| PUT    | `/profile`         | Actualiza datos personales (nombre, email, dirección, teléfono…). |
| PUT    | `/profile/password`| Cambia la contraseña. Body: `{ current_password, new_password }`. |
| GET    | `/profile/email`   | Cambio rápido de email. Query: `email`.                  |

## Catálogo

| Método | Ruta              | Descripción                                                                 |
|--------|-------------------|-------------------------------------------------------------------------------|
| GET    | `/categories`     | Lista de categorías con el número de productos.                              |
| GET    | `/products`       | Lista paginada. Query: `search, category, sort, page, limit, featured, exclude`. |
| GET    | `/products/:id`   | Detalle de un producto.                                                       |

## Carrito (`/api/cart`) 🔒

| Método | Ruta                      | Descripción                                   |
|--------|---------------------------|--------------------------------------------------|
| GET    | `/cart`                   | Carrito actual del usuario con importes.         |
| GET    | `/cart/summary`           | `{ item_count }`, usado en el contador de la cabecera. |
| POST   | `/cart/items`             | Añade un producto. Body: `{ product_id, quantity? }`. |
| PUT    | `/cart/items/:productId`  | Cambia la cantidad. Body: `{ quantity }`.        |
| DELETE | `/cart/items/:productId`  | Elimina una línea del carrito.                   |
| DELETE | `/cart`                   | Vacía el carrito.                                |

## Pedidos (`/api/orders`) 🔒

| Método | Ruta          | Descripción                                                         |
|--------|---------------|-------------------------------------------------------------------------|
| GET    | `/orders`     | Historial de pedidos del usuario autenticado.                          |
| GET    | `/orders/:id` | Detalle de un pedido con sus líneas.                                   |
| POST   | `/orders`     | Checkout simulado. Body: `{ items: [{ product_id, quantity, price }], shipping_name, shipping_address, shipping_city, shipping_postal_code, shipping_country, shipping_phone?, payment_method }` (`payment_method`: `card`, `transfer` o `cod`). Vacía el carrito. No hay pasarela de pago real. |

## Comentarios

| Método | Ruta                               | Descripción                                                     |
|--------|-------------------------------------|---------------------------------------------------------------------|
| GET    | `/products/:productId/comments`    | Lista de comentarios de un producto (público).                      |
| POST   | `/products/:productId/comments`    | 🔒 Crea un comentario. JSON `{ content }` o `multipart/form-data` con `content` e imagen en el campo `image`. |
| DELETE | `/comments/:id`                    | 🔒 Borra un comentario propio, o cualquiera si eres `admin`.          |

## Administración (`/api/admin`) 🛠

| Método | Ruta                         | Descripción                                              |
|--------|------------------------------|--------------------------------------------------------------|
| GET    | `/admin/stats`               | Resumen para el panel (nº productos, usuarios, pedidos…).    |
| GET    | `/admin/products`            | Lista paginada. Query: `search, page, limit`.                |
| POST   | `/admin/products`            | Crea un producto.                                             |
| GET    | `/admin/products/:id`        | Detalle de un producto (vista de administración).             |
| PUT    | `/admin/products/:id`        | Actualiza un producto.                                        |
| DELETE | `/admin/products/:id`        | Elimina un producto.                                          |
| POST   | `/admin/products/:id/image`  | Sube la imagen del producto (`multipart/form-data`, campo `image`). |
| DELETE | `/admin/products/:id/image`  | Elimina la imagen del producto.                                |
| GET    | `/admin/users`               | Lista paginada de usuarios. Query: `search, page, limit`.      |
| PUT    | `/admin/users/:id`           | Cambia `role` y/o `is_active` de un usuario.                   |
| GET    | `/admin/orders`              | Lista paginada de pedidos. Query: `status, page, limit`.       |
| GET    | `/admin/orders/:id`          | Detalle de un pedido.                                          |
| PUT    | `/admin/orders/:id/status`   | Cambia el estado de un pedido. Body: `{ status }`.             |
