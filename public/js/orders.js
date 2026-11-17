'use strict';

(function (CS) {
  const { el, api } = CS;

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await CS.session.load())) { window.location.replace('/login.html?next=/orders.html'); return; }

    const root = document.getElementById('orders-root');
    try {
      const { items } = await api.get('/api/orders');
      if (!items.length) {
        root.replaceChildren(el('div', { class: 'state-box' },
          el('p', { text: 'Todavía no has hecho ningún pedido.' }),
          el('a', { class: 'btn', href: '/catalog.html', text: 'Ir al catálogo' })));
        return;
      }
      root.replaceChildren(el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' },
        el('thead', {}, el('tr', {},
          ...['Pedido', 'Fecha', 'Estado', 'Artículos', 'Total', ''].map((h) => el('th', { scope: 'col', text: h })))),
        el('tbody', {}, ...items.map((o) => el('tr', {},
          el('td', { 'data-label': 'Pedido', text: `#${o.id}` }),
          el('td', { 'data-label': 'Fecha', text: CS.formatDate(o.created_at) }),
          el('td', { 'data-label': 'Estado' }, CS.statusBadge(o.status)),
          el('td', { 'data-label': 'Artículos', text: String(o.item_count) }),
          el('td', { 'data-label': 'Total', text: CS.formatPrice(o.total) }),
          el('td', {}, el('a', { href: `/order.html?id=${encodeURIComponent(o.id)}`, text: 'Ver detalle' }))))))));
    } catch (err) {
      root.replaceChildren(el('div', { class: 'state-box error', text: err.message }));
    }
  });
})(window.CS);
