'use strict';

(function (CS) {
  const { el, api, admin, forms } = CS;
  const MAX_BYTES = 2 * 1024 * 1024;
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  admin.sections.products = async function products(panel) {
    const state = { search: '', page: 1 };
    let categories = [];
    try { categories = (await api.get('/api/categories')).items; } catch (e) { /* el select quedará vacío */ }

    const formHost = el('div');
    const listHost = el('div');
    const searchInput = el('input', { type: 'search', placeholder: 'Buscar producto…', 'aria-label': 'Buscar producto', maxlength: '100' });
    let timer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.search = searchInput.value.trim(); state.page = 1; loadList(); }, 300);
    });

    panel.replaceChildren(
      el('div', { class: 'admin-toolbar' }, searchInput,
        el('button', { class: 'btn', type: 'button', text: '+ Nuevo producto', onclick: () => openForm(null) })),
      formHost, listHost);

    async function loadList() {
      try {
        const data = await api.get('/api/admin/products', { search: state.search, page: state.page, limit: 10 });
        if (data.page > data.pages) { state.page = data.pages; return loadList(); }
        listHost.replaceChildren(
          data.items.length
            ? admin.table(['', 'Producto', 'Categoría', 'Precio', 'Stock', 'Estado', ''], data.items.map(row))
            : admin.state('No hay productos con ese criterio.'),
          admin.pager(data, (page) => { state.page = page; loadList(); }));
      } catch (err) {
        listHost.replaceChildren(admin.state(err.message, true));
      }
      return null;
    }

    function row(p) {
      return el('tr', {},
        el('td', { 'data-label': '' }, el('div', { class: 'thumb-sm' }, CS.productImage(p, false))),
        el('td', { 'data-label': 'Producto' }, el('strong', { text: p.name }), el('br'), el('small', { class: 'muted', text: `ID ${p.id}` })),
        el('td', { 'data-label': 'Categoría', text: p.category_name || '—' }),
        el('td', { 'data-label': 'Precio', text: CS.formatPrice(p.price) }),
        el('td', { 'data-label': 'Stock', class: p.stock <= 5 ? 'stock warn' : '', text: String(p.stock) }),
        el('td', { 'data-label': 'Estado' },
          el('span', { class: p.is_active ? 'status-badge status-ok' : 'status-badge status-bad', text: p.is_active ? 'Activo' : 'Inactivo' }),
          p.is_featured ? el('span', { class: 'status-badge status-info', text: '★ Destacado' }) : null),
        el('td', { class: 'row-actions' },
          el('button', { class: 'btn btn-outline btn-sm', type: 'button', text: 'Editar', onclick: () => openForm(p.id) }),
          el('button', {
            class: 'btn btn-outline btn-sm btn-danger', type: 'button', text: 'Eliminar',
            onclick: async () => {
              if (!window.confirm(`¿Eliminar "${p.name}"? También se borrarán sus comentarios. Esta acción no se puede deshacer.`)) return;
              try { await api.del(`/api/admin/products/${p.id}`); CS.toast('Producto eliminado', 'ok'); loadList(); }
              catch (err) { CS.toast(err.message, 'error'); }
            },
          })));
    }

    async function openForm(id) {
      let product = null;
      if (id) {
        try { product = (await api.get(`/api/admin/products/${id}`)).product; }
        catch (err) { CS.toast(err.message, 'error'); return; }
      }

      const alertBox = el('div', { hidden: true, role: 'alert' });
      const description = el('textarea', { id: 'f-description', name: 'description', rows: '4', maxlength: '5000' });
      description.value = product && product.description ? product.description : '';

      const select = el('select', { id: 'f-category_id', name: 'category_id' },
        el('option', { value: '', text: '— Sin categoría —' }),
        ...categories.map((c) => el('option', { value: String(c.id), text: c.name })));
      select.value = product && product.category_id ? String(product.category_id) : '';

      const featured = el('input', { type: 'checkbox', name: 'is_featured' });
      featured.checked = Boolean(product && product.is_featured);
      const active = el('input', { type: 'checkbox', name: 'is_active' });
      active.checked = product ? product.is_active : true;
      const removeImage = el('input', { type: 'checkbox', name: 'remove_image' });
      const imageInput = el('input', { id: 'f-image', name: 'image', type: 'file', accept: IMAGE_TYPES.join(',') });
      const submit = el('button', { class: 'btn', type: 'submit', text: product ? 'Guardar cambios' : 'Crear producto' });

      const form = el('form', { class: 'card form-card admin-form', novalidate: true },
        el('h2', { text: product ? `Editar producto #${product.id}` : 'Nuevo producto' }),
        alertBox,
        admin.field({ name: 'name', label: 'Nombre', value: product && product.name, attrs: { required: true, maxlength: '150' } }),
        el('div', { class: 'field-row' },
          admin.field({ name: 'price', label: 'Precio (€)', value: product && product.price, attrs: { required: true, inputmode: 'decimal' } }),
          admin.field({ name: 'stock', label: 'Stock', type: 'number', value: product ? product.stock : 0, attrs: { min: '0', max: '100000', required: true } })),
        el('div', { class: 'field' }, el('label', { for: 'f-category_id', text: 'Categoría' }), select,
          el('small', { class: 'field-error', 'data-error-for': 'category_id' })),
        el('div', { class: 'field' }, el('label', { for: 'f-description', text: 'Descripción' }), description,
          el('small', { class: 'field-error', 'data-error-for': 'description' })),
        el('div', { class: 'check-row' },
          el('label', {}, active, ' Visible en la tienda'),
          el('label', {}, featured, ' Producto destacado')),
        el('div', { class: 'field' },
          el('label', { for: 'f-image', text: 'Imagen (JPG, PNG, GIF o WEBP, máx. 2 MB)' }),
          product && product.image ? el('div', { class: 'current-image' }, el('img', { src: product.image, alt: product.name }),
            el('label', {}, removeImage, ' Quitar imagen actual')) : null,
          imageInput, el('small', { class: 'field-error', 'data-error-for': 'image' })),
        el('div', { class: 'form-actions' }, submit,
          el('button', { class: 'btn btn-outline', type: 'button', text: 'Cancelar', onclick: () => formHost.replaceChildren() })));

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        forms.clearErrors(form);
        forms.hideAlert(alertBox);

        const file = imageInput.files[0];
        if (file && (!IMAGE_TYPES.includes(file.type) || file.size > MAX_BYTES)) {
          forms.showFieldErrors(form, { image: 'La imagen debe ser JPG, PNG, GIF o WEBP de hasta 2 MB.' });
          return;
        }

        const body = {
          name: form.elements.name.value, price: form.elements.price.value, stock: form.elements.stock.value,
          description: description.value, category_id: select.value || null,
          is_featured: featured.checked, is_active: active.checked,
        };

        forms.setBusy(submit, true, 'Guardando…');
        try {
          const saved = product
            ? await api.put(`/api/admin/products/${product.id}`, body)
            : await api.post('/api/admin/products', body);
          const savedId = saved.product.id;

          let imageError = null;
          try {
            if (file) {
              const data = new FormData();
              data.append('image', file);
              await api.postForm(`/api/admin/products/${savedId}/image`, data);
            } else if (removeImage.checked) {
              await api.del(`/api/admin/products/${savedId}/image`);
            }
          } catch (err) { imageError = err.message; }

          formHost.replaceChildren();
          CS.toast(imageError ? `Producto guardado, pero la imagen falló: ${imageError}` : 'Producto guardado', imageError ? 'error' : 'ok');
          loadList();
        } catch (err) {
          forms.setBusy(submit, false);
          if (err.data && err.data.fields) forms.showFieldErrors(form, err.data.fields);
          forms.showAlert(alertBox, 'error', err.message);
        }
      });

      formHost.replaceChildren(form);
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      form.elements.name.focus();
    }

    await loadList();
  };
})(window.CS);
