'use strict';

(function (CS) {
  const { el, api } = CS;
  const root = () => document.getElementById('order-root');

  function showError(message) {
    root().replaceChildren(el('div', { class: 'state-box error' },
      el('p', { text: message }),
      el('a', { class: 'btn btn-outline', href: '/orders.html', text: 'Volver a mis pedidos' })));
  }

  function render(order, isNew) {
    document.title = `Pedido #${order.id} · CyberShop`;
    root().replaceChildren(
      isNew ? el('div', { class: 'alert alert-ok', role: 'status' },
        '¡Gracias por tu compra! Hemos registrado tu pedido. (Pago simulado: no se ha realizado ningún cargo.)') : null,
      el('div', { class: 'page-head order-head' },
        el('h1', { text: `Pedido #${order.id}` }), CS.statusBadge(order.status)),
      el('div', { class: 'order-layout' },
        el('div', { class: 'card form-card' },
          el('h2', { text: 'Artículos' }),
          el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' },
            el('thead', {}, el('tr', {}, ...['Producto', 'Precio', 'Cantidad', 'Subtotal'].map((h) => el('th', { scope: 'col', text: h })))),
            el('tbody', {}, ...order.items.map((i) => el('tr', {},
              el('td', { 'data-label': 'Producto' }, i.product_id
                ? el('a', { href: CS.productUrl(i.product_id), text: i.product_name }) : i.product_name),
              el('td', { 'data-label': 'Precio', text: CS.formatPrice(i.unit_price) }),
              el('td', { 'data-label': 'Cantidad', text: String(i.quantity) }),
              el('td', { 'data-label': 'Subtotal', text: CS.formatPrice(i.line_total) })))))),
          el('dl', { class: 'summary-list' },
            el('dt', { text: 'Subtotal' }), el('dd', { text: CS.formatPrice(order.subtotal) }),
            el('dt', { text: 'Envío' }), el('dd', { text: order.shipping_cost === 0 ? 'Gratis' : CS.formatPrice(order.shipping_cost) }),
            el('dt', { class: 'summary-total', text: 'Total' }), el('dd', { class: 'summary-total', text: CS.formatPrice(order.total) }))),
        el('aside', { class: 'card form-card' },
          el('h2', { text: 'Envío y pago' }),
          el('dl', { class: 'detail-meta' },
            el('dt', { text: 'Fecha' }), el('dd', { text: CS.formatDate(order.created_at) }),
            el('dt', { text: 'Destinatario' }), el('dd', { text: order.shipping_name }),
            el('dt', { text: 'Dirección' }), el('dd', { text: `${order.shipping_address}, ${order.shipping_postal_code} ${order.shipping_city} (${order.shipping_country})` }),
            el('dt', { text: 'Teléfono' }), el('dd', { text: order.shipping_phone || '—' }),
            el('dt', { text: 'Pago' }), el('dd', { text: CS.paymentLabel(order.payment_method) })))));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await CS.session.load())) {
      window.location.replace(`/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!/^\d{1,9}$/.test(id || '')) { showError('Pedido no válido.'); return; }

    try {
      const { order } = await api.get(`/api/orders/${id}`);
      render(order, params.get('new') === '1');
    } catch (err) {
      showError(err.status === 404 ? 'Pedido no encontrado.' : err.message);
    }
  });
})(window.CS);
