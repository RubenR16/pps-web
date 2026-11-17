'use strict';

/** Utilidades compartidas por las secciones del panel de administración. */
(function (CS) {
  const { el } = CS;
  const admin = { sections: {} };

  admin.pager = function pager(data, onGo) {
    if (data.pages <= 1) return el('div');
    const numbers = [];
    for (let n = 1; n <= data.pages; n++) {
      if (n === 1 || n === data.pages || Math.abs(n - data.page) <= 1) numbers.push(n);
      else if (numbers[numbers.length - 1] !== '…') numbers.push('…');
    }
    return el('nav', { class: 'pagination', 'aria-label': 'Paginación' },
      el('button', { class: 'page-btn', type: 'button', disabled: data.page === 1, text: '‹', onclick: () => onGo(data.page - 1) }),
      ...numbers.map((n) => (n === '…'
        ? el('span', { class: 'page-btn', 'aria-hidden': 'true', text: '…' })
        : el('button', { class: n === data.page ? 'page-btn active' : 'page-btn', type: 'button', text: String(n), onclick: () => onGo(n) }))),
      el('button', { class: 'page-btn', type: 'button', disabled: data.page === data.pages, text: '›', onclick: () => onGo(data.page + 1) }));
  };

  admin.field = function field({ name, label, type = 'text', value = '', attrs = {} }) {
    const input = el('input', { id: `f-${name}`, name, type, value: value === null ? '' : String(value), ...attrs });
    return el('div', { class: 'field' },
      el('label', { for: `f-${name}`, text: label }), input,
      el('small', { class: 'field-error', 'data-error-for': name }));
  };

  admin.state = (message, error) => el('div', { class: error ? 'state-box error' : 'state-box', text: message });
  admin.table = (headers, rows) => el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' },
    el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col', text: h })))),
    el('tbody', {}, ...rows)));

  CS.admin = admin;
})(window.CS);
