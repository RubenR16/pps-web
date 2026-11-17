'use strict';

function createCategoryModel(db) {
  /** Categorías con el número de productos activos de cada una. */
  async function listWithCounts() {
    return db.execute(
      `SELECT c.id, c.name, c.slug, c.description, COUNT(p.id) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id, c.name, c.slug, c.description
        ORDER BY c.name ASC`
    );
  }

  return { listWithCounts };
}

module.exports = { createCategoryModel };
