'use strict';

(function (CS) {
  const { el, api, admin } = CS;

  admin.sections.overview = async function overview(panel) {
    const s = await api.get('/api/admin/stats');
    const card = (label, value, cls) => el('div', { class: `card stat-card ${cls || ''}` },
      el('span', { class: 'muted', text: label }), el('strong', { text: value }));

    panel.replaceChildren(
      el('div', { class: 'stat-grid' },
        card('Ingresos (pedidos pagados)', CS.formatPrice(s.revenue)),
        card('Pedidos', String(s.orders)),
        card('Pedidos pendientes', String(s.pending_orders), s.pending_orders ? 'stat-warn' : ''),
        card('Usuarios', String(s.users)),
        card('Productos activos', String(s.products)),
        card('Stock bajo (≤ 5)', String(s.low_stock), s.low_stock ? 'stat-warn' : '')),
      el('h2', { class: 'admin-h2', text: 'Últimos pedidos' }),
      s.recent_orders.length
        ? admin.table(['Pedido', 'Fecha', 'Cliente', 'Estado', 'Total'], s.recent_orders.map((o) => el('tr', {},
          el('td', { 'data-label': 'Pedido' }, el('a', { href: '#orders', text: `#${o.id}` })),
          el('td', { 'data-label': 'Fecha', text: CS.formatDate(o.created_at) }),
          el('td', { 'data-label': 'Cliente', text: o.username }),
          el('td', { 'data-label': 'Estado' }, CS.statusBadge(o.status)),
          el('td', { 'data-label': 'Total', text: CS.formatPrice(o.total) }))))
        : admin.state('Todavía no hay pedidos.'));
  };
})(window.CS);
