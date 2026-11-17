'use strict';

(function (CS) {
  const { el, api, forms } = CS;
  const $ = (id) => document.getElementById(id);

  function renderSummary(cart) {
    const t = cart.totals;
    $('checkout-summary').replaceChildren(
      el('h2', { text: 'Tu pedido' }),
      el('ul', { class: 'summary-items' }, ...cart.items.map((i) =>
        el('li', {},
          el('span', { text: `${i.quantity} × ${i.name}` }),
          el('span', { text: CS.formatPrice(i.line_total) })))),
      el('dl', { class: 'summary-list' },
        el('dt', { text: 'Subtotal' }), el('dd', { text: CS.formatPrice(t.subtotal) }),
        el('dt', { text: 'Envío' }), el('dd', { text: t.shipping === 0 ? 'Gratis' : CS.formatPrice(t.shipping) }),
        el('dt', { class: 'summary-total', text: 'Total' }), el('dd', { class: 'summary-total', text: CS.formatPrice(t.total) })),
      el('a', { href: '/cart.html', class: 'muted', text: '← Modificar carrito' }));
  }

  function prefill(user) {
    const form = $('checkout-form');
    const map = {
      shipping_name: user.full_name, shipping_address: user.address, shipping_city: user.city,
      shipping_postal_code: user.postal_code, shipping_country: user.country, shipping_phone: user.phone,
    };
    for (const [field, value] of Object.entries(map)) form.elements[field].value = value || '';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await CS.session.load();
    if (!user) { window.location.replace('/login.html?next=/checkout.html'); return; }

    let cart;
    try { cart = await api.get('/api/cart'); } catch (e) { cart = null; }
    if (!cart || !cart.items.length) { window.location.replace('/cart.html'); return; }
    if (!cart.can_checkout) { window.location.replace('/cart.html'); return; }

    renderSummary(cart);
    prefill(user);
    $('checkout-root').hidden = false;

    const form = $('checkout-form');
    const alertBox = $('checkout-alert');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      forms.clearErrors(form);
      forms.hideAlert(alertBox);
      forms.setBusy(button, true, 'Procesando…');
      try {
        const items = cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: i.price }));
        const { order } = await api.post('/api/orders', { ...forms.readForm(form), items });
        window.location.href = `/order.html?id=${encodeURIComponent(order.id)}&new=1`;
      } catch (err) {
        forms.setBusy(button, false);
        if (err.data && err.data.fields) forms.showFieldErrors(form, err.data.fields);
        forms.showAlert(alertBox, 'error', err.message);
      }
    });
  });
})(window.CS);
