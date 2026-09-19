const fetch = require('node-fetch');

// TheMealDB free public test API key ("1") - no registration required.
const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

function simplifyMeal(meal) {
  if (!meal) return null;
  const ingredients = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        ingredient: ingredient.trim(),
        measure: measure ? measure.trim() : '',
      });
    }
  }

  return {
    externalId: meal.idMeal,
    title: meal.strMeal,
    category: meal.strCategory || '',
    area: meal.strArea || '',
    image: meal.strMealThumb || '',
    ingredients,
    instructions: meal.strInstructions || '',
  };
}

async function searchByName(name) {
  const res = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(name)}`);
  const data = await res.json();
  return (data.meals || []).map(simplifyMeal);
}

async function filterByIngredient(ingredient) {
  const res = await fetch(`${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`);
  const data = await res.json();
  // filter.php returns partial records only (id, name, thumbnail) - look up full detail for each.
  const partials = data.meals || [];
  const detailed = await Promise.all(partials.map((m) => lookupById(m.idMeal)));
  return detailed.filter(Boolean);
}

async function lookupById(id) {
  const res = await fetch(`${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`);
  const data = await res.json();
  const meal = (data.meals || [])[0];
  return simplifyMeal(meal);
}

module.exports = { searchByName, filterByIngredient, lookupById };
