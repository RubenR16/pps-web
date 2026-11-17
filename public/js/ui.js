'use strict';

/**
 * Utilidades de interfaz compartidas: constructor de DOM, formato de precios,
 * tarjetas de producto, cabecera y pie.
 */
(function (CS) {
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  function formatPrice(value) { return money.format(Number(value) || 0); }

  const EMOJI = {
    perifericos: '⌨️', componentes: '🧠', redes: '📡',
    almacenamiento: '💾', 'hardware-hacking': '🔧', accesorios: '🎒',
  };
  function categoryEmoji(slug) { return EMOJI[slug] || '🛒'; }

  const GRADIENTS = [
    ['#1e3a8a', '#6d28d9'], ['#312e81', '#0e7490'], ['#4c1d95', '#1d4ed8'],
    ['#1e40af', '#7e22ce'], ['#3730a3', '#0f766e'],
  ];

  /** Imagen del producto: la real si existe; si no, un marcador con degradado y emoji de su categoría. */
  function productImage(product, large) {
    if (product.image) {
      return el('img', { src: product.image, alt: product.name, loading: 'lazy' });
    }
    const [a, b] = GRADIENTS[product.id % GRADIENTS.length];
    const ph = el('div', { class: large ? 'ph ph-large' : 'ph', role: 'img', 'aria-label': product.name },
      el('span', { 'aria-hidden': 'true', text: categoryEmoji(product.category_slug) }));
    ph.style.background = `linear-gradient(135deg, ${a}, ${b})`;
    return ph;
  }

  function stockInfo(stock) {
    if (stock <= 0) return { label: 'Agotado', cls: 'bad' };
    if (stock <= 5) return { label: `Últimas ${stock} unidades`, cls: 'warn' };
    return { label: 'En stock', cls: 'ok' };
  }

  function productUrl(id) { return `/product.html?id=${encodeURIComponent(id)}`; }

  function productCard(p) {
    const stock = stockInfo(p.stock);
    return el('article', { class: 'card product-card' },
      el('a', { href: productUrl(p.id), class: 'card-media', 'aria-label': p.name }, productImage(p, false)),
      el('div', { class: 'card-body' },
        el('span', { class: 'badge', text: p.category_name || 'Sin categoría' }),
        el('h3', { class: 'card-title' }, el('a', { href: productUrl(p.id), text: p.name })),
        el('div', { class: 'card-foot' },
          el('span', { class: 'price', text: formatPrice(p.price) }),
          el('span', { class: `stock ${stock.cls}`, text: stock.label }))));
  }

  function renderHeader() {
    const mount = document.getElementById('site-header');
    if (!mount) return;

    const path = window.location.pathname;
    const navLink = (href, label, active) => el('a', { href, class: active ? 'nav-link active' : 'nav-link', text: label });

    const params = new URLSearchParams(window.location.search);
    const searchInput = el('input', {
      type: 'search', name: 'search', placeholder: 'Buscar productos…',
      'aria-label': 'Buscar productos', maxlength: '100',
    });
    if (path.endsWith('/catalog.html')) searchInput.value = params.get('search') || '';

    const toggle = el('button', { class: 'nav-toggle', type: 'button', 'aria-label': 'Abrir menú', 'aria-expanded': 'false', text: '☰' });

    const header = el('header', { class: 'site-header' },
      el('div', { class: 'container header-inner' },
        el('a', { href: '/', class: 'logo', 'aria-label': 'CyberShop, inicio' }, 'Cyber', el('span', { text: 'Shop' })),
        toggle,
        el('nav', { class: 'main-nav', 'aria-label': 'Principal' },
          navLink('/', 'Inicio', path === '/' || path.endsWith('/index.html')),
          navLink('/catalog.html', 'Catálogo', path.endsWith('/catalog.html'))),
        el('form', { class: 'header-search', action: '/catalog.html', method: 'get', role: 'search' }, searchInput),
        el('div', { class: 'header-actions', id: 'header-actions' })));

    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    mount.replaceChildren(header);
  }

  function renderFooter() {
    const mount = document.getElementById('site-footer');
    if (!mount) return;
    mount.replaceChildren(el('footer', { class: 'site-footer' },
      el('div', { class: 'container footer-inner' },
        el('span', { text: `© ${new Date().getFullYear()} CyberShop · Laboratorio educativo con datos ficticios` }))));
  }

  function initLayout() {
    renderHeader();
    renderFooter();
    if (CS.renderAuthActions) CS.renderAuthActions();
  }

  /** Aviso flotante temporal. kind: "ok" | "error". */
  function toast(message, kind) {
    let box = document.getElementById('toast-box');
    if (!box) {
      box = el('div', { id: 'toast-box', class: 'toast-box', role: 'status', 'aria-live': 'polite' });
      document.body.append(box);
    }
    const node = el('div', { class: `toast toast-${kind || 'ok'}`, text: message });
    box.append(node);
    setTimeout(() => node.remove(), 3500);
  }

  const STATUS = {
    pending: ['Pendiente', 'warn'], paid: ['Pagado', 'ok'], shipped: ['Enviado', 'info'],
    delivered: ['Entregado', 'ok'], cancelled: ['Cancelado', 'bad'],
  };
  function statusBadge(status) {
    const [label, cls] = STATUS[status] || [status, 'info'];
    return el('span', { class: `status-badge status-${cls}`, text: label });
  }

  const PAYMENTS = { card: 'Tarjeta (simulada)', transfer: 'Transferencia (simulada)', cod: 'Contra reembolso (simulado)' };
  function paymentLabel(method) { return PAYMENTS[method] || method; }

  function formatDate(value) {
    return new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  }

  Object.assign(CS, { toast, statusBadge, paymentLabel, formatDate, el, formatPrice, categoryEmoji, productImage, productCard, productUrl, stockInfo, initLayout });
  document.addEventListener('DOMContentLoaded', initLayout);
})((window.CS = window.CS || {}));
