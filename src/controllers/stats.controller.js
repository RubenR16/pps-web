'use strict';

function createStatsController({ model }) {
  return {
    async overview(req, res, next) {
      try {
        res.json(await model.overview());
      } catch (err) { next(err); }
    },
  };
}

module.exports = { createStatsController };
