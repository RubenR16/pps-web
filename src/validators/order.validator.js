'use strict';

/** Método de pago simulado -> estado inicial del pedido. No se solicita ni guarda ningún dato de tarjeta. */
const PAYMENT_METHODS = Object.freeze({ card: 'paid', transfer: 'pending', cod: 'pending' });

const POSTAL_RE = /^[A-Za-z0-9 -]{3,12}$/;
const PHONE_RE = /^[0-9+()\-\s]{6,30}$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function required(body, field, max, label, errors) {
  const value = text(body[field]);
  if (!value) errors[field] = `${label} es obligatorio.`;
  else if (value.length > max) errors[field] = `${label}: máximo ${max} caracteres.`;
  return value;
}

/** Valida los datos de envío y el método de pago del checkout. */
function validateCheckout(body) {
  const errors = {};
  const value = {
    shipping_name: required(body, 'shipping_name', 120, 'El nombre', errors),
    shipping_address: required(body, 'shipping_address', 255, 'La dirección', errors),
    shipping_city: required(body, 'shipping_city', 80, 'La ciudad', errors),
    shipping_postal_code: required(body, 'shipping_postal_code', 12, 'El código postal', errors),
    shipping_country: required(body, 'shipping_country', 80, 'El país', errors),
    shipping_phone: text(body.shipping_phone) || null,
    payment_method: typeof body.payment_method === 'string' ? body.payment_method : '',
  };

  if (!errors.shipping_postal_code && !POSTAL_RE.test(value.shipping_postal_code)) {
    errors.shipping_postal_code = 'El código postal no tiene un formato válido.';
  }
  if (value.shipping_phone && !PHONE_RE.test(value.shipping_phone)) {
    errors.shipping_phone = 'El teléfono no tiene un formato válido.';
  }
  if (!Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, value.payment_method)) {
    errors.payment_method = 'Selecciona un método de pago.';
  }
  return { errors, value };
}

/** Artículos del pedido: [{ product_id, quantity, price }] tal y como los envía el carrito. */
function validateOrderItems(rawItems) {
  const errors = {};
  const items = [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    errors.items = 'No hay artículos en el pedido.';
    return { errors, items };
  }
  for (const raw of rawItems) {
    const productId = Number(raw && raw.product_id);
    const quantity = Number(raw && raw.quantity);
    const price = Number(raw && raw.price);
    if (!Number.isInteger(productId) || productId < 1) { errors.items = 'Producto no válido.'; break; }
    if (!Number.isInteger(quantity) || quantity < 1) { errors.items = 'Cantidad no válida.'; break; }
    if (!Number.isFinite(price) || price < 0) { errors.items = 'Precio no válido.'; break; }
    items.push({ productId, quantity, price });
  }
  return { errors, items };
}

module.exports = { validateCheckout, validateOrderItems, PAYMENT_METHODS };
