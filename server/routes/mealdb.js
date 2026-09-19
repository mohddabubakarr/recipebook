const express = require('express');
const mealdb = require('../mealdbClient');

const router = express.Router();

// GET /api/mealdb/search?q=chicken&by=name|ingredient
router.get('/search', async (req, res) => {
  const { q, by = 'name' } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const results =
      by === 'ingredient'
        ? await mealdb.filterByIngredient(q.trim())
        : await mealdb.searchByName(q.trim());
    res.json({ results });
  } catch (err) {
    console.error('TheMealDB search failed:', err.message);
    res.status(502).json({ error: 'Could not reach the recipe database. Please try again.' });
  }
});

// GET /api/mealdb/:id - full detail for a single external recipe
router.get('/:id', async (req, res) => {
  try {
    const meal = await mealdb.lookupById(req.params.id);
    if (!meal) return res.status(404).json({ error: 'Recipe not found.' });
    res.json(meal);
  } catch (err) {
    console.error('TheMealDB lookup failed:', err.message);
    res.status(502).json({ error: 'Could not reach the recipe database. Please try again.' });
  }
});

module.exports = router;
