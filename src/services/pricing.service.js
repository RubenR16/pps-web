'use strict';

/** Cálculo de importes. Se opera en céntimos para evitar errores de coma flotante. */
const SHIPPING_CENTS = 499;               // gastos de envío: 4,99 €
const FREE_SHIPPING_FROM_CENTS = 10000;   // envío gratis a partir de 100 €

function toCents(value) {
  return Math.round(Number(value) * 100);
}

/** items: [{ price, quantity }] -> importes en euros. */
function computeTotals(items) {
  const subtotalCents = items.reduce((sum, i) => sum + toCents(i.price) * i.quantity, 0);
  const shippingCents = subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
  const missing = shippingCents > 0 ? FREE_SHIPPING_FROM_CENTS - subtotalCents : 0;
  return {
    subtotal: subtotalCents / 100,
    shipping: shippingCents / 100,
    total: (subtotalCents + shippingCents) / 100,
    missing_for_free_shipping: missing / 100,
  };
}

module.exports = { computeTotals, toCents, SHIPPING_CENTS, FREE_SHIPPING_FROM_CENTS };
