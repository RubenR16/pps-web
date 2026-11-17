'use strict';

(function (CS) {
  const { el, api, admin } = CS;
  const ACTION_LABELS = {
    paid: 'Marcar como pagado', shipped: 'Marcar como enviado',
    delivered: 'Marcar como entregado', cancelled: 'Cancelar pedido',
  };
  const FILTERS = [['', 'Todos los estados'], ['pending', 'Pendientes'], ['paid', 'Pagados'], ['shipped', 'Enviados'], ['delivered', 'Entregados'], ['cancelled', 'Cancelados']];

  admin.sections.orders = async function orders(panel) {
    const state = { status: '', page: 1 };
    const detailHost = el('div');
    const listHost = el('div');

    const filter = el('select', { 'aria-label': 'Filtrar por estado' }, ...FILTERS.map(([v, t]) => el('option', { value: v, text: t })));
    filter.addEventListener('change', () => { state.status = filter.value; state.page = 1; loadList(); });
    panel.replaceChildren(el('div', { class: 'admin-toolbar' }, filter), detailHost, listHost);

    async function openDetail(id) {
      try {
        const { order } = await api.get(`/api/admin/orders/${id}`);
        renderDetail(order);
        detailHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) { CS.toast(err.message, 'error'); }
    }

    async function setStatus(order, status) {
      const extra = status === 'cancelled' ? ' Se devolverá el stock de los productos.' : '';
      if (!window.confirm(`¿${ACTION_LABELS[status]} del pedido #${order.id}?${extra}`)) return;
      try {
        const { order: updated } = await api.put(`/api/admin/orders/${order.id}/status`, { status });
        CS.toast('Estado actualizado', 'ok');
        renderDetail(updated);
        loadList();
      } catch (err) { CS.toast(err.message, 'error'); }
    }

    function renderDetail(o) {
      detailHost.replaceChildren(el('section', { class: 'card form-card admin-detail' },
        el('div', { class: 'order-head' },
          el('h2', { text: `Pedido #${o.id}` }), CS.statusBadge(o.status),
          el('button', { class: 'btn btn-outline btn-sm', type: 'button', text: 'Cerrar', onclick: () => detailHost.replaceChildren() })),
        el('div', { class: 'order-layout' },
          el('div', {},
            admin.table(['Producto', 'Precio', 'Cant.', 'Subtotal'], o.items.map((i) => el('tr', {},
              el('td', { 'data-label': 'Producto', text: i.product_name }),
              el('td', { 'data-label': 'Precio', text: CS.formatPrice(i.unit_price) }),
              el('td', { 'data-label': 'Cant.', text: String(i.quantity) }),
              el('td', { 'data-label': 'Subtotal', text: CS.formatPrice(i.line_total) })))),
            el('dl', { class: 'summary-list' },
              el('dt', { text: 'Subtotal' }), el('dd', { text: CS.formatPrice(o.subtotal) }),
              el('dt', { text: 'Envío' }), el('dd', { text: o.shipping_cost === 0 ? 'Gratis' : CS.formatPrice(o.shipping_cost) }),
              el('dt', { class: 'summary-total', text: 'Total' }), el('dd', { class: 'summary-total', text: CS.formatPrice(o.total) }))),
          el('dl', { class: 'detail-meta' },
            el('dt', { text: 'Cliente' }), el('dd', { text: `${o.username} (${o.email})` }),
            el('dt', { text: 'Fecha' }), el('dd', { text: CS.formatDate(o.created_at) }),
            el('dt', { text: 'Destinatario' }), el('dd', { text: o.shipping_name }),
            el('dt', { text: 'Dirección' }), el('dd', { text: `${o.shipping_address}, ${o.shipping_postal_code} ${o.shipping_city} (${o.shipping_country})` }),
            el('dt', { text: 'Teléfono' }), el('dd', { text: o.shipping_phone || '—' }),
            el('dt', { text: 'Pago' }), el('dd', { text: CS.paymentLabel(o.payment_method) }))),
        el('div', { class: 'form-actions' },
          ...(o.allowed_statuses.length
            ? o.allowed_statuses.map((s) => el('button', {
              class: s === 'cancelled' ? 'btn btn-outline btn-danger' : 'btn', type: 'button',
              text: ACTION_LABELS[s], onclick: () => setStatus(o, s),
            }))
            : [el('span', { class: 'muted', text: 'Este pedido está en un estado final.' })]))));
    }

    async function loadList() {
      try {
        const data = await api.get('/api/admin/orders', { status: state.status, page: state.page, limit: 10 });
        if (data.page > data.pages) { state.page = data.pages; return loadList(); }
        listHost.replaceChildren(
          data.items.length
            ? admin.table(['Pedido', 'Fecha', 'Cliente', 'Artículos', 'Estado', 'Total', ''], data.items.map((o) => el('tr', {},
              el('td', { 'data-label': 'Pedido', text: `#${o.id}` }),
              el('td', { 'data-label': 'Fecha', text: CS.formatDate(o.created_at) }),
              el('td', { 'data-label': 'Cliente', text: o.username }),
              el('td', { 'data-label': 'Artículos', text: String(o.item_count) }),
              el('td', { 'data-label': 'Estado' }, CS.statusBadge(o.status)),
              el('td', { 'data-label': 'Total', text: CS.formatPrice(o.total) }),
              el('td', { class: 'row-actions' }, el('button', { class: 'btn btn-outline btn-sm', type: 'button', text: 'Ver / gestionar', onclick: () => openDetail(o.id) })))))
            : admin.state('No hay pedidos con ese estado.'),
          admin.pager(data, (page) => { state.page = page; loadList(); }));
      } catch (err) {
        listHost.replaceChildren(admin.state(err.message, true));
      }
      return null;
    }
    await loadList();
  };
})(window.CS);
