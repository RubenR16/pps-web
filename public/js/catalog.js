'use strict';

(function (CS) {
  const { el, api } = CS;
  const PAGE_SIZE = 12;

  const state = readState();
  let requestToken = 0;
  let searchTimer = null;

  const $ = (id) => document.getElementById(id);

  function readState() {
    const p = new URLSearchParams(window.location.search);
    const page = Number.parseInt(p.get('page'), 10);
    return {
      search: (p.get('search') || '').slice(0, 100),
      category: p.get('category') || '',
      sort: p.get('sort') || 'newest',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }

  function writeUrl(push) {
    const p = new URLSearchParams();
    if (state.search) p.set('search', state.search);
    if (state.category) p.set('category', state.category);
    if (state.sort !== 'newest') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', String(state.page));
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  function update(changes) {
    Object.assign(state, changes);
    writeUrl(true);
    loadProducts();
  }

  /* ---------- Categorías ---------- */
  let categories = [];

  function renderCategories() {
    const total = categories.reduce((sum, c) => sum + c.product_count, 0);
    const btn = (slug, name, count) => el('li', {},
      el('button', {
        type: 'button',
        class: state.category === slug ? 'cat-btn active' : 'cat-btn',
        'aria-pressed': String(state.category === slug),
        onclick: () => update({ category: slug, page: 1 }),
      }, el('span', { text: name }), el('small', { text: String(count) })));

    $('category-list').replaceChildren(
      btn('', 'Todas', total),
      ...categories.map((c) => btn(c.slug, c.name, c.product_count)));
  }

  async function loadCategories() {
    try {
      categories = (await api.get('/api/categories')).items;
      renderCategories();
    } catch (e) {
      $('category-list').replaceChildren(el('li', { class: 'state-box error', text: e.message }));
    }
  }

  /* ---------- Productos ---------- */
  function renderPagination(page, pages) {
    const mount = $('pagination');
    if (pages <= 1) { mount.replaceChildren(); return; }

    const go = (n) => () => { update({ page: n }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const numbers = [];
    for (let n = 1; n <= pages; n++) {
      if (n === 1 || n === pages || Math.abs(n - page) <= 1) numbers.push(n);
      else if (numbers[numbers.length - 1] !== '…') numbers.push('…');
    }

    mount.replaceChildren(
      el('button', { class: 'page-btn', type: 'button', disabled: page === 1, onclick: go(page - 1), 'aria-label': 'Página anterior', text: '‹' }),
      ...numbers.map((n) => (n === '…'
        ? el('span', { class: 'page-btn', 'aria-hidden': 'true', text: '…' })
        : el('button', {
          class: n === page ? 'page-btn active' : 'page-btn', type: 'button',
          'aria-current': n === page ? 'page' : null, onclick: go(n), text: String(n),
        }))),
      el('button', { class: 'page-btn', type: 'button', disabled: page === pages, onclick: go(page + 1), 'aria-label': 'Página siguiente', text: '›' }));
  }

  async function loadProducts() {
    const token = ++requestToken;
    const results = $('results');
    results.replaceChildren(...Array.from({ length: 6 }, () => el('div', { class: 'skeleton' })));
    renderCategories();

    try {
      const data = await api.get('/api/products', {
        search: state.search, category: state.category, sort: state.sort, page: state.page, limit: PAGE_SIZE,
      });
      if (token !== requestToken) return; // llegó una respuesta más reciente

      if (data.page > data.pages) { update({ page: data.pages }); return; }

      const current = categories.find((c) => c.slug === state.category);
      $('result-count').innerHTML =
        `${data.total} ${data.total === 1 ? 'producto' : 'productos'}` +
        (current ? ` en ${current.name}` : '') +
        (state.search ? ` para «${state.search}»` : '');

      results.replaceChildren(...(data.items.length
        ? data.items.map(CS.productCard)
        : [el('div', { class: 'state-box', text: 'No hemos encontrado productos con esos filtros.' })]));
      renderPagination(data.page, data.pages);
    } catch (e) {
      if (token !== requestToken) return;
      results.replaceChildren(el('div', { class: 'state-box error', text: e.message }));
      $('pagination').replaceChildren();
    }
  }

  /* ---------- Eventos ---------- */
  function syncControls() {
    $('filter-search').value = state.search;
    $('filter-sort').value = state.sort;
    const headerSearch = document.querySelector('.header-search input');
    if (headerSearch) headerSearch.value = state.search;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    syncControls();

    $('filter-search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => update({ search: e.target.value.trim(), page: 1 }), 300);
    });
    $('filter-form').addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(searchTimer);
      update({ search: $('filter-search').value.trim(), page: 1 });
    });
    $('filter-sort').addEventListener('change', (e) => update({ sort: e.target.value, page: 1 }));

    window.addEventListener('popstate', () => {
      Object.assign(state, readState());
      syncControls();
      loadProducts();
    });

    await loadCategories();
    writeUrl(false);
    loadProducts();
  });
})(window.CS);
