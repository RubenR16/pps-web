'use strict';

(function (CS) {
  const { api, forms } = CS;

  function wire(form, { endpoint, mapBody, success, busyText }) {
    const alertBox = document.getElementById('form-alert');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      forms.clearErrors(form);
      forms.hideAlert(alertBox);

      const data = forms.readForm(form);
      const clientErrors = form.validateExtra ? form.validateExtra(data) : null;
      if (clientErrors) { forms.showFieldErrors(form, clientErrors); return; }

      forms.setBusy(button, true, busyText);
      try {
        await api.post(endpoint, mapBody(data));
        window.location.href = success();
      } catch (err) {
        forms.setBusy(button, false);
        if (err.data && err.data.fields) forms.showFieldErrors(form, err.data.fields);
        forms.showAlert(alertBox, 'error', err.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Si ya hay sesión iniciada, estas páginas no tienen sentido.
    if (await CS.session.load()) { window.location.replace('/'); return; }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      wire(loginForm, {
        endpoint: '/api/auth/login',
        busyText: 'Entrando…',
        mapBody: (d) => ({ identifier: d.identifier, password: d.password }),
        success: () => forms.safeNext('/'),
      });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.validateExtra = (d) => (d.password !== d.password2
        ? { password2: 'Las contraseñas no coinciden.' } : null);
      wire(registerForm, {
        endpoint: '/api/auth/register',
        busyText: 'Creando cuenta…',
        mapBody: (d) => ({ username: d.username, email: d.email, full_name: d.full_name, password: d.password }),
        success: () => '/',
      });
    }
  });
})(window.CS);
