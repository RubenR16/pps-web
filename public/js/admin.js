'use strict';

(function (CS) {
  const { el } = CS;
  const TABS = [['overview', 'Resumen'], ['products', 'Productos'], ['users', 'Usuarios'], ['orders', 'Pedidos']];

  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('admin-root');
    const user = await CS.session.load();
    if (!user) { window.location.replace('/login.html?next=/admin.html'); return; }
    if (user.role !== 'admin') {
      root.replaceChildren(el('div', { class: 'state-box error' },
        el('p', { text: 'Acceso restringido a administradores.' }),
        el('a', { class: 'btn btn-outline', href: '/', text: 'Volver a la tienda' })));
      return;
    }

    const nav = el('nav', { class: 'admin-tabs', 'aria-label': 'Secciones' });
    const content = el('div', { class: 'admin-content' });
    root.replaceChildren(nav, content);

    const currentTab = () => {
      const hash = window.location.hash.slice(1);
      return TABS.some(([key]) => key === hash) ? hash : 'overview';
    };

    async function show() {
      const tab = currentTab();
      nav.replaceChildren(...TABS.map(([key, label]) =>
        el('a', { href: `#${key}`, class: key === tab ? 'admin-tab active' : 'admin-tab', 'aria-current': key === tab ? 'page' : null, text: label })));

      // Cada visita usa un contenedor nuevo: si una carga lenta termina tarde, escribe en uno ya descartado.
      const panel = el('div', {}, el('div', { class: 'skeleton', style: 'height:160px' }));
      content.replaceChildren(panel);
      try {
        await CS.admin.sections[tab](panel, { user });
      } catch (err) {
        panel.replaceChildren(CS.admin.state(err.message, true));
      }
    }

    window.addEventListener('hashchange', show);
    show();
  });
})(window.CS);
