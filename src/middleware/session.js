'use strict';

const session = require('express-session');

const SESSION_COOKIE = 'cybershop.sid';

function createSessionMiddleware({ store, secret }) {
  return session({
    name: SESSION_COOKIE,
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      maxAge: 2 * 60 * 60 * 1000, // 2 horas
    },
  });
}

module.exports = { createSessionMiddleware, SESSION_COOKIE };
