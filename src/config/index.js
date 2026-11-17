'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { loadConfig } = require('./env');

module.exports = loadConfig(process.env);
