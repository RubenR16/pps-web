'use strict';

/** Ayudas para formularios: errores por campo, avisos, estado de envío y redirección segura. */
(function (CS) {
  function clearErrors(form) {
    form.querySelectorAll('[data-error-for]').forEach((n) => { n.textContent = ''; });
    form.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
  }

  function showFieldErrors(form, fields) {
    let first = null;
    for (const [name, message] of Object.entries(fields || {})) {
      const out = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
      const input = form.elements[name];
      if (out) out.textContent = message;
      if (input && typeof input.setAttribute === 'function') {
        input.setAttribute('aria-invalid', 'true');
        if (!first) first = input;
      }
    }
    if (first) first.focus();
  }

  function showAlert(box, kind, message) {
    box.hidden = false;
    box.className = `alert alert-${kind}`;
    box.textContent = message;
  }

  function hideAlert(box) { box.hidden = true; box.textContent = ''; }

  function setBusy(button, busy, busyText) {
    if (busy) { button.dataset.label = button.textContent; button.textContent = busyText || 'Enviando…'; }
    else if (button.dataset.label) { button.textContent = button.dataset.label; }
    button.disabled = busy;
  }

  /** Destino tras el login: solo rutas internas ("/algo"), nunca URLs externas ni "//host". */
  function safeNext(fallback) {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && /^\/(?![/\\])/.test(next) ? next : fallback;
  }

  function readForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  CS.forms = { clearErrors, showFieldErrors, showAlert, hideAlert, setBusy, safeNext, readForm };
})(window.CS);
