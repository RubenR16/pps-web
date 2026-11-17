'use strict';

(function (CS) {
  const { api, forms } = CS;
  const $ = (id) => document.getElementById(id);
  const PROFILE_FIELDS = ['full_name', 'email', 'phone', 'address', 'city', 'postal_code', 'country'];

  function fill(user) {
    $('profile-username').textContent = user.username;
    $('profile-role').textContent = user.role === 'admin' ? 'Administrador' : 'Usuario';
    $('profile-since').textContent = new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const form = $('profile-form');
    for (const field of PROFILE_FIELDS) form.elements[field].value = user[field] || '';
  }

  function wire(form, alertId, request, onSuccess) {
    const alertBox = $(alertId);
    const button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      forms.clearErrors(form);
      forms.hideAlert(alertBox);

      const data = forms.readForm(form);
      const extra = form.validateExtra ? form.validateExtra(data) : null;
      if (extra) { forms.showFieldErrors(form, extra); return; }

      forms.setBusy(button, true, 'Guardando…');
      try {
        const result = await request(data);
        forms.setBusy(button, false);
        onSuccess(result, alertBox);
      } catch (err) {
        forms.setBusy(button, false);
        if (err.status === 401) { window.location.href = '/login.html?next=/profile.html'; return; }
        if (err.data && err.data.fields) forms.showFieldErrors(form, err.data.fields);
        forms.showAlert(alertBox, 'error', err.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await CS.session.load();
    if (!user) { window.location.replace('/login.html?next=/profile.html'); return; }
    fill(user);
    $('profile-root').hidden = false;

    wire($('profile-form'), 'profile-alert',
      (d) => api.put('/api/profile', d),
      async (result, box) => {
        fill(result.user);
        forms.showAlert(box, 'ok', 'Datos guardados correctamente.');
        CS.renderAuthActions(true);
      });

    const pwForm = $('password-form');
    pwForm.validateExtra = (d) => (d.new_password !== d.new_password2 ? { new_password2: 'Las contraseñas no coinciden.' } : null);
    wire(pwForm, 'password-alert',
      (d) => api.put('/api/profile/password', { current_password: d.current_password, new_password: d.new_password }),
      (result, box) => {
        pwForm.reset();
        forms.showAlert(box, 'ok', 'Contraseña actualizada.');
      });
  });
})(window.CS);
