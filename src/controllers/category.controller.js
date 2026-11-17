'use strict';

function createCategoryController(model) {
  return {
    async list(req, res, next) {
      try {
        res.json({ items: await model.listWithCounts() });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createCategoryController };
