'use strict';

const MAX_PER_ITEM = 10;

function toPositiveInt(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d{1,9}$/.test(value) && Number(value) > 0) return Number(value);
  return null;
}

function quantityOf(value, errors) {
  const quantity = toPositiveInt(value);
  if (quantity === null || quantity > MAX_PER_ITEM) {
    errors.quantity = `La cantidad debe ser un entero entre 1 y ${MAX_PER_ITEM}.`;
  }
  return quantity;
}

/** POST /api/cart/items  {product_id, quantity?}  (cantidad por defecto: 1). */
function validateAddItem(body) {
  const errors = {};
  const productId = toPositiveInt(body.product_id);
  if (productId === null) errors.product_id = 'Producto no válido.';
  const quantity = body.quantity === undefined ? 1 : quantityOf(body.quantity, errors);
  return { errors, value: { productId, quantity } };
}

/** PUT /api/cart/items/:productId  {quantity} */
function validateQuantity(body) {
  const errors = {};
  const quantity = quantityOf(body.quantity, errors);
  return { errors, value: { quantity } };
}

module.exports = { validateAddItem, validateQuantity, MAX_PER_ITEM };
