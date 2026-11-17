'use strict';

/** Comentarios de la ficha de producto (con imagen opcional). */
(function (CS) {
  const { el, api } = CS;
  const MAX_BYTES = 2 * 1024 * 1024;
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  document.addEventListener('DOMContentLoaded', async () => {
    const productId = new URLSearchParams(window.location.search).get('id');
    const section = document.getElementById('comments-section');
    const root = document.getElementById('comments-root');
    if (!section || !root || !/^\d{1,9}$/.test(productId || '')) return;

    let comments;
    try {
      comments = (await api.get(`/api/products/${productId}/comments`)).items;
    } catch (e) { return; } // producto inexistente: no se muestra la sección
    const user = await CS.session.load();

    const title = document.getElementById('comments-title');
    const list = el('div', { class: 'comment-list' });
    const updateTitle = () => { title.textContent = `Comentarios (${list.children.length})`; };

    function commentNode(c) {
      const canDelete = user && (user.id === c.user_id || user.role === 'admin');
      const node = el('article', { class: 'comment' },
        el('header', { class: 'comment-head' },
          el('strong', { html: c.username }),
          el('span', { class: 'muted', text: CS.formatDate(c.created_at) }),
          canDelete ? el('button', {
            class: 'btn btn-outline btn-sm', type: 'button', text: 'Borrar',
            onclick: async () => {
              if (!window.confirm('¿Borrar este comentario?')) return;
              try { await api.del(`/api/comments/${c.id}`); node.remove(); updateTitle(); }
              catch (err) { CS.toast(err.message, 'error'); }
            },
          }) : null),
        el('p', { class: 'comment-body', html: c.content }),
        c.image ? el('img', { class: 'comment-image', src: c.image, alt: `Imagen de ${c.username}`, loading: 'lazy' }) : null);
      return node;
    }

    comments.forEach((c) => list.append(commentNode(c)));

    let formNode;
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      formNode = el('p', { class: 'muted' }, el('a', { href: `/login.html?next=${next}`, text: 'Inicia sesión' }), ' para dejar un comentario.');
    } else {
      const textarea = el('textarea', { name: 'content', rows: '3', maxlength: '1000', required: true, placeholder: 'Escribe tu comentario…', 'aria-label': 'Comentario' });
      const file = el('input', { type: 'file', name: 'image', accept: IMAGE_TYPES.join(','), 'aria-label': 'Imagen (opcional)' });
      const error = el('small', { class: 'field-error' });
      const button = el('button', { class: 'btn', type: 'submit', text: 'Publicar comentario' });
      formNode = el('form', { class: 'comment-form', novalidate: true },
        textarea, el('div', { class: 'comment-form-row' }, file, button), error);

      formNode.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';
        const content = textarea.value.trim();
        const image = file.files[0];
        if (!content) { error.textContent = 'Escribe un comentario.'; return; }
        if (image && !IMAGE_TYPES.includes(image.type)) { error.textContent = 'La imagen debe ser JPG, PNG, GIF o WEBP.'; return; }
        if (image && image.size > MAX_BYTES) { error.textContent = 'La imagen supera los 2 MB.'; return; }

        button.disabled = true;
        try {
          let created;
          if (image) {
            const data = new FormData();
            data.append('content', content);
            data.append('image', image);
            created = await api.postForm(`/api/products/${productId}/comments`, data);
          } else {
            created = await api.post(`/api/products/${productId}/comments`, { content });
          }
          list.prepend(commentNode(created.comment));
          formNode.reset();
          updateTitle();
          CS.toast('Comentario publicado', 'ok');
        } catch (err) {
          error.textContent = err.message;
        } finally {
          button.disabled = false;
        }
      });
    }

    root.replaceChildren(formNode, list);
    updateTitle();
    section.hidden = false;
  });
})(window.CS);
