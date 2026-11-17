'use strict';

(function (CS) {
  const { el, api } = CS;
  const $ = (id) => document.getElementById(id);

  async function refresh(request) {
    try {
      render(await request());
    } catch (err) {
      CS.toast(err.message, 'error');
      render(await api.get('/api/cart').catch(() => null));
    }
    CS.refreshCartCount();
  }

  function line(item) {
    const qty = el('input', {
      type: 'number', min: '1', max: String(Math.min(Math.max(item.stock, 1), 10)), value: String(item.quantity),
      'aria-label': `Cantidad de ${item.name}`,
    });
    qty.addEventListener('change', () => {
      const value = Number(qty.value);
      if (!Number.isInteger(value) || value < 1) { qty.value = String(item.quantity); return; }
      refresh(() => api.put(`/api/cart/items/${item.product_id}`, { quantity: value }));
    });

    return el('article', { class: item.issue ? 'cart-line has-issue' : 'cart-line' },
      el('a', { class: 'cart-thumb', href: CS.productUrl(item.product_id), 'aria-label': item.name }, CS.productImage(item, false)),
      el('div', { class: 'cart-info' },
        el('a', { class: 'cart-name', href: CS.productUrl(item.product_id), text: item.name }),
        el('span', { class: 'muted', text: `${CS.formatPrice(item.price)} / unidad` }),
        item.issue ? el('span', { class: 'stock bad', text: item.issue }) : null),
      el('div', { class: 'cart-qty' }, qty),
      el('strong', { class: 'cart-total', text: CS.formatPrice(item.line_total) }),
      el('button', {
        class: 'btn btn-outline btn-sm', type: 'button', 'aria-label': `Quitar ${item.name}`, text: 'Quitar',
        onclick: () => refresh(() => api.del(`/api/cart/items/${item.product_id}`)),
      }));
  }

  function summary(cart) {
    const t = cart.totals;
    return el('aside', { class: 'card summary-card' },
      el('h2', { text: 'Resumen' }),
      el('dl', { class: 'summary-list' },
        el('dt', { text: `Productos (${cart.item_count})` }), el('dd', { text: CS.formatPrice(t.subtotal) }),
        el('dt', { text: 'Envío' }), el('dd', { text: t.shipping === 0 ? 'Gratis' : CS.formatPrice(t.shipping) }),
        el('dt', { class: 'summary-total', text: 'Total' }), el('dd', { class: 'summary-total', text: CS.formatPrice(t.total) })),
      t.missing_for_free_shipping > 0
        ? el('p', { class: 'hint', text: `Añade ${CS.formatPrice(t.missing_for_free_shipping)} más para tener envío gratis.` }) : null,
      cart.can_checkout
        ? el('a', { class: 'btn btn-block', href: '/checkout.html', text: 'Finalizar compra' })
        : el('p', { class: 'stock bad', text: 'Corrige los avisos del carrito para continuar.' }),
      el('button', {
        class: 'btn btn-outline btn-block', type: 'button', text: 'Vaciar carrito',
        onclick: () => { if (window.confirm('¿Vaciar el carrito?')) refresh(() => api.del('/api/cart')); },
      }));
  }

  function render(cart) {
    const root = $('cart-root');
    if (!cart) { root.replaceChildren(el('div', { class: 'state-box error', text: 'No se pudo cargar el carrito.' })); return; }
    if (!cart.items.length) {
      root.replaceChildren(el('div', { class: 'state-box' },
        el('p', { text: 'Tu carrito está vacío.' }),
        el('a', { class: 'btn', href: '/catalog.html', text: 'Explorar el catálogo' })));
      return;
    }
    root.replaceChildren(el('div', { class: 'cart-layout' },
      el('div', { class: 'cart-lines' }, ...cart.items.map(line)),
      summary(cart)));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!(await CS.session.load())) { window.location.replace('/login.html?next=/cart.html'); return; }
    refresh(() => api.get('/api/cart'));
  });
})(window.CS);
