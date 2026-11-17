'use strict';

/** Cliente mínimo de la API (Fetch). */
(function (CS) {
  async function request(path, params, options = {}) {
    const url = new URL(path, window.location.origin);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== '' && value !== null && value !== undefined) url.searchParams.set(key, value);
      }
    }

    let res;
    try {
      const method = options.method || 'GET';
      const init = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
      if (options.formData) {
        init.body = options.formData; // multipart: el navegador añade el Content-Type con su boundary
      } else if (options.body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      }
      res = await fetch(url, init);
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor.');
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* respuesta sin JSON */ }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Error ${res.status}`);
      err.status = res.status;
      err.data = data; // incluye "fields" con errores por campo, si los hay
      throw err;
    }
    return data;
  }

  CS.api = {
    get: (path, params) => request(path, params),
    post: (path, body) => request(path, null, { method: 'POST', body: body === undefined ? {} : body }),
    put: (path, body) => request(path, null, { method: 'PUT', body: body === undefined ? {} : body }),
    del: (path) => request(path, null, { method: 'DELETE' }),
    postForm: (path, formData) => request(path, null, { method: 'POST', formData }),
  };
})((window.CS = window.CS || {}));
