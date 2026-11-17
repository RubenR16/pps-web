'use strict';

(function (CS) {
  const { el, api } = CS;

  async function loadCategories() {
    const mount = document.getElementById('home-categories');
    try {
      const { items } = await api.get('/api/categories');
      mount.replaceChildren(...items.map((c) =>
        el('a', { class: 'category-card', href: `/catalog.html?category=${encodeURIComponent(c.slug)}` },
          el('span', { class: 'emoji', 'aria-hidden': 'true', text: CS.categoryEmoji(c.slug) }),
          el('strong', { text: c.name }),
          el('small', { text: `${c.product_count} productos` }))));
    } catch (e) {
      mount.replaceChildren(el('div', { class: 'state-box error', text: e.message }));
    }
  }

  async function loadFeatured() {
    const mount = document.getElementById('home-featured');
    try {
      const data = await api.get('/api/products', { featured: '1', limit: 8 });
      mount.replaceChildren(...(data.items.length
        ? data.items.map(CS.productCard)
        : [el('div', { class: 'state-box', text: 'Todavía no hay productos destacados.' })]));
    } catch (e) {
      mount.replaceChildren(el('div', { class: 'state-box error', text: e.message }));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadFeatured();
  });
})(window.CS);
