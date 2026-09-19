const express = require('express');
const { db } = require('../db');

const router = express.Router();

function rowToRecipe(row) {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    title: row.title,
    category: row.category,
    area: row.area,
    image: row.image,
    ingredients: JSON.parse(row.ingredients || '[]'),
    instructions: row.instructions,
    createdAt: row.created_at,
  };
}

// GET /api/recipes - list every saved/custom recipe in the collection
router.get('/', (req, res) => {
  db.all('SELECT * FROM recipes ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load your collection.' });
    res.json({ results: rows.map(rowToRecipe) });
  });
});

// GET /api/recipes/:id
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM recipes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to load recipe.' });
    if (!row) return res.status(404).json({ error: 'Recipe not found.' });
    res.json(rowToRecipe(row));
  });
});

// POST /api/recipes - save a MealDB recipe (source: "mealdb") or add a custom recipe (source: "custom")
router.post('/', (req, res) => {
  const {
    source,
    externalId = null,
    title,
    category = '',
    area = '',
    image = '',
    ingredients = [],
    instructions = '',
  } = req.body || {};

  if (!source || !['mealdb', 'custom'].includes(source)) {
    return res.status(400).json({ error: 'source must be "mealdb" or "custom".' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required.' });
  }
  if (source === 'custom' && (!Array.isArray(ingredients) || ingredients.length === 0)) {
    return res.status(400).json({ error: 'A custom recipe needs at least one ingredient.' });
  }
  if (source === 'custom' && !instructions.trim()) {
    return res.status(400).json({ error: 'A custom recipe needs instructions.' });
  }
  if (source === 'mealdb' && !externalId) {
    return res.status(400).json({ error: 'externalId is required when saving from MealDB.' });
  }

  const sql = `INSERT INTO recipes (source, external_id, title, category, area, image, ingredients, instructions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    source,
    source === 'mealdb' ? String(externalId) : null,
    title.trim(),
    category,
    area,
    image,
    JSON.stringify(ingredients),
    instructions,
  ];

  db.run(sql, params, function insertCallback(err) {
    if (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'This recipe is already in your collection.' });
      }
      return res.status(500).json({ error: 'Failed to save recipe.' });
    }
    db.get('SELECT * FROM recipes WHERE id = ?', [this.lastID], (err2, row) => {
      if (err2 || !row) return res.status(500).json({ error: 'Recipe saved but could not be reloaded.' });
      res.status(201).json(rowToRecipe(row));
    });
  });
});

// DELETE /api/recipes/:id - remove a recipe from the collection
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM recipes WHERE id = ?', [req.params.id], function deleteCallback(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete recipe.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Recipe not found.' });
    res.status(204).send();
  });
});

module.exports = router;
