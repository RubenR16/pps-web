'use strict';

/** Estado de sesión del usuario y botones de la cabecera (Iniciar sesión / Perfil / Salir). */
(function (CS) {
  const { el, api } = CS;
  let pending = null;

  /** Devuelve el usuario actual (o null). Se cachea; load(true) fuerza una nueva consulta. */
  function load(force) {
    if (!pending || force) {
      pending = api.get('/api/auth/me').then((data) => data.user).catch(() => null);
    }
    return pending;
  }

  async function logout() {
    try { await api.post('/api/auth/logout'); } catch (e) { /* aunque falle, se vuelve a la portada */ }
    window.location.href = '/';
  }

  function cartLink() {
    return el('a', { class: 'nav-link cart-link', href: '/cart.html', title: 'Carrito' },
      '🛒 Carrito ', el('span', { class: 'cart-count', id: 'cart-count', hidden: true, text: '0' }));
  }

  /** Actualiza el contador del carrito en la cabecera (solo con sesión iniciada). */
  async function refreshCartCount() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const user = await load();
    if (!user) { badge.hidden = true; return; }
    try {
      const { item_count: count } = await api.get('/api/cart/summary');
      badge.textContent = String(count);
      badge.hidden = count === 0;
    } catch (e) { badge.hidden = true; }
  }

  async function renderAuthActions(force) {
    const mount = document.getElementById('header-actions');
    if (!mount) return;
    const user = await load(force);

    if (!user) {
      mount.replaceChildren(
        cartLink(),
        el('a', { class: 'btn btn-outline btn-sm', href: '/login.html', text: 'Iniciar sesión' }),
        el('a', { class: 'btn btn-sm', href: '/register.html', text: 'Registrarse' }));
      return;
    }
    mount.replaceChildren(
      cartLink(),
      user.role === 'admin' ? el('a', { class: 'nav-link', href: '/admin.html', text: '🛠 Admin' }) : null,
      el('a', { class: 'nav-link', href: '/orders.html', text: '📦 Pedidos' }),
      el('a', { class: 'nav-link', href: '/profile.html', title: 'Mi perfil' }, '👤 ', user.username),
      el('button', { class: 'btn btn-outline btn-sm', type: 'button', onclick: logout, text: 'Salir' }));
    refreshCartCount();
  }

  CS.session = { load, logout };
  CS.renderAuthActions = renderAuthActions;
  CS.refreshCartCount = refreshCartCount;
})(window.CS);
