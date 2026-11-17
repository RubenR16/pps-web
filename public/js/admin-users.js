'use strict';

(function (CS) {
  const { el, api, admin } = CS;

  admin.sections.users = async function users(panel, { user: me }) {
    const state = { search: '', page: 1 };
    const listHost = el('div');
    const searchInput = el('input', { type: 'search', placeholder: 'Buscar por usuario, email o nombre…', 'aria-label': 'Buscar usuario', maxlength: '100' });
    let timer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.search = searchInput.value.trim(); state.page = 1; loadList(); }, 300);
    });
    panel.replaceChildren(el('div', { class: 'admin-toolbar' }, searchInput), listHost);

    async function change(u, body, confirmText) {
      if (confirmText && !window.confirm(confirmText)) { loadList(); return; }
      try {
        await api.put(`/api/admin/users/${u.id}`, body);
        CS.toast('Usuario actualizado', 'ok');
      } catch (err) {
        CS.toast(err.message, 'error');
      }
      loadList();
    }

    function row(u) {
      const isMe = u.id === me.id;
      const roleSelect = el('select', { 'aria-label': `Rol de ${u.username}`, disabled: isMe },
        el('option', { value: 'user', text: 'Usuario' }), el('option', { value: 'admin', text: 'Administrador' }));
      roleSelect.value = u.role;
      roleSelect.addEventListener('change', () => change(u, { role: roleSelect.value },
        `¿Cambiar el rol de "${u.username}" a ${roleSelect.value === 'admin' ? 'administrador' : 'usuario'}?`));

      return el('tr', {},
        el('td', { 'data-label': 'Usuario' }, el('strong', { text: u.username }), isMe ? el('small', { class: 'muted', text: ' (tú)' }) : null,
          el('br'), el('small', { class: 'muted', text: u.full_name || '' })),
        el('td', { 'data-label': 'Email', text: u.email }),
        el('td', { 'data-label': 'Rol' }, roleSelect),
        el('td', { 'data-label': 'Estado' },
          el('span', { class: u.is_active ? 'status-badge status-ok' : 'status-badge status-bad', text: u.is_active ? 'Activa' : 'Desactivada' })),
        el('td', { 'data-label': 'Pedidos', text: String(u.order_count) }),
        el('td', { 'data-label': 'Alta', text: new Date(u.created_at).toLocaleDateString('es-ES') }),
        el('td', { class: 'row-actions' }, el('button', {
          class: 'btn btn-outline btn-sm', type: 'button', disabled: isMe, text: u.is_active ? 'Desactivar' : 'Activar',
          onclick: () => change(u, { is_active: !u.is_active },
            u.is_active ? `¿Desactivar la cuenta de "${u.username}"? No podrá iniciar sesión.` : null),
        })));
    }

    async function loadList() {
      try {
        const data = await api.get('/api/admin/users', { search: state.search, page: state.page, limit: 15 });
        if (data.page > data.pages) { state.page = data.pages; return loadList(); }
        listHost.replaceChildren(
          data.items.length ? admin.table(['Usuario', 'Email', 'Rol', 'Estado', 'Pedidos', 'Alta', ''], data.items.map(row)) : admin.state('No hay usuarios con ese criterio.'),
          admin.pager(data, (page) => { state.page = page; loadList(); }));
      } catch (err) {
        listHost.replaceChildren(admin.state(err.message, true));
      }
      return null;
    }
    await loadList();
  };
})(window.CS);
