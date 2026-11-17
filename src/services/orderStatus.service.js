'use strict';

/** Transiciones de estado permitidas para un pedido. "delivered" y "cancelled" son estados finales. */
const TRANSITIONS = Object.freeze({
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
});

const ALL_STATUSES = Object.keys(TRANSITIONS);

function allowedNext(status) {
  return TRANSITIONS[status] ? [...TRANSITIONS[status]] : [];
}

function canTransition(from, to) {
  return allowedNext(from).includes(to);
}

module.exports = { TRANSITIONS, ALL_STATUSES, allowedNext, canTransition };
