'use strict';

(function (CS) {
  const { el, api } = CS;
  const $ = (id) => document.getElementById(id);

  function showError(message) {
    $('product-root').replaceChildren(el('div', { class: 'state-box error' },
      el('p', { text: message }),
      el('a', { class: 'btn btn-outline', href: '/catalog.html', text: 'Volver al catálogo' })));
  }

  function renderBreadcrumb(p) {
    $('breadcrumb').replaceChildren(
      el('a', { href: '/', text: 'Inicio' }), '›',
      el('a', { href: '/catalog.html', text: 'Catálogo' }), '›',
      p.category_slug ? el('a', { href: `/catalog.html?category=${encodeURIComponent(p.category_slug)}`, text: p.category_name }) : null,
      p.category_slug ? '›' : null,
      el('span', { 'aria-current': 'page', text: p.name }));
  }

  function purchaseBlock(p) {
    if (p.stock <= 0) return el('p', { class: 'stock bad', text: 'Producto agotado.' });

    const qty = el('input', {
      type: 'number', id: 'qty', min: '1', max: String(Math.min(p.stock, 10)), value: '1', 'aria-label': 'Cantidad',
    });
    const button = el('button', { class: 'btn', type: 'button', text: 'Añadir al carrito' });

    button.addEventListener('click', async () => {
      const user = await CS.session.load();
      if (!user) {
        window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      button.disabled = true;
      try {
        await api.post('/api/cart/items', { product_id: p.id, quantity: Number(qty.value) });
        CS.toast('Añadido al carrito', 'ok');
        CS.refreshCartCount();
      } catch (err) {
        CS.toast(err.message, 'error');
      } finally {
        button.disabled = false;
      }
    });

    return el('div', { class: 'purchase' }, qty, button, el('a', { class: 'btn btn-outline', href: '/cart.html', text: 'Ver carrito' }));
  }

  function renderProduct(p) {
    const stock = CS.stockInfo(p.stock);
    $('product-root').replaceChildren(el('div', { class: 'product-detail' },
      el('div', { class: 'detail-media' }, CS.productImage(p, true)),
      el('div', { class: 'detail-info' },
        el('span', { class: 'badge', text: p.category_name || 'Sin categoría' }),
        el('h1', { text: p.name }),
        el('div', { class: 'detail-price', text: CS.formatPrice(p.price) }),
        el('p', { class: 'detail-desc', text: p.description || 'Sin descripción.' }),
        purchaseBlock(p),
        el('dl', { class: 'detail-meta' },
          el('dt', { text: 'Disponibilidad' }), el('dd', { class: `stock ${stock.cls}`, text: stock.label }),
          el('dt', { text: 'Referencia' }), el('dd', { text: `CS-${String(p.id).padStart(5, '0')}` }),
          el('dt', { text: 'Categoría' }), el('dd', { text: p.category_name || '—' })))));
  }

  async function loadRelated(p) {
    if (!p.category_slug) return;
    try {
      const data = await api.get('/api/products', { category: p.category_slug, exclude: p.id, limit: 4 });
      if (!data.items.length) return;
      $('related-section').hidden = false;
      $('related').replaceChildren(...data.items.map(CS.productCard));
    } catch (e) { /* los relacionados son opcionales */ }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!/^\d{1,9}$/.test(id || '')) { showError('Producto no válido.'); return; }

    try {
      const product = await api.get(`/api/products/${id}`);
      document.title = `${product.name} · CyberShop`;
      renderBreadcrumb(product);
      renderProduct(product);
      loadRelated(product);
    } catch (e) {
      showError(e.status === 404 ? 'Este producto no existe o ya no está disponible.' : e.message);
    }
  });
})(window.CS);
