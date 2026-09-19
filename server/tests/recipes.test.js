// Integration tests for the /api/recipes collection endpoints.
// Run with: npm test  (node --test server/tests)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB = path.join(__dirname, 'test.sqlite');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
process.env.DB_PATH = TEST_DB;

const { init } = require('../db');
const createApp = require('../app');

let server;
let baseUrl;

test.before(async () => {
  await init();
  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

test.after(() => {
  server.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

async function post(path_, body) {
  const res = await fetch(`${baseUrl}${path_}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test('rejects a custom recipe with no ingredients', async () => {
  const { status, body } = await post('/api/recipes', {
    source: 'custom',
    title: 'Empty Soup',
    ingredients: [],
    instructions: 'Boil water.',
  });
  assert.equal(status, 400);
  assert.match(body.error, /ingredient/i);
});

test('rejects a custom recipe with no instructions', async () => {
  const { status, body } = await post('/api/recipes', {
    source: 'custom',
    title: 'Mystery Dish',
    ingredients: [{ ingredient: 'Salt', measure: '1 tsp' }],
    instructions: '',
  });
  assert.equal(status, 400);
  assert.match(body.error, /instructions/i);
});

test('rejects a mealdb save missing externalId', async () => {
  const { status, body } = await post('/api/recipes', {
    source: 'mealdb',
    title: 'Untraceable Curry',
  });
  assert.equal(status, 400);
  assert.match(body.error, /externalId/i);
});

test('saves a valid custom recipe and lists it in the collection', async () => {
  const { status, body } = await post('/api/recipes', {
    source: 'custom',
    title: "Grandma's Lentil Soup",
    category: 'Soup',
    area: 'Indian',
    ingredients: [
      { ingredient: 'Red Lentils', measure: '200g' },
      { ingredient: 'Onion', measure: '1' },
    ],
    instructions: 'Simmer lentils with onion for 25 minutes.',
  });
  assert.equal(status, 201);
  assert.equal(body.title, "Grandma's Lentil Soup");
  assert.equal(body.ingredients.length, 2);

  const listRes = await fetch(`${baseUrl}/api/recipes`);
  const { results } = await listRes.json();
  assert.ok(results.some((r) => r.id === body.id));
});

test('prevents saving the exact same MealDB recipe twice', async () => {
  const payload = {
    source: 'mealdb',
    externalId: '52771',
    title: 'Spicy Arrabiata Penne',
    ingredients: [{ ingredient: 'Penne', measure: '1 pound' }],
    instructions: 'Cook pasta, add sauce.',
  };
  const first = await post('/api/recipes', payload);
  assert.equal(first.status, 201);

  const second = await post('/api/recipes', payload);
  assert.equal(second.status, 409);
});

test('deletes a saved recipe from the collection', async () => {
  const { body: created } = await post('/api/recipes', {
    source: 'custom',
    title: 'Temporary Snack',
    ingredients: [{ ingredient: 'Crackers', measure: '' }],
    instructions: 'Open the box.',
  });

  const del = await fetch(`${baseUrl}/api/recipes/${created.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);

  const getAfter = await fetch(`${baseUrl}/api/recipes/${created.id}`);
  assert.equal(getAfter.status, 404);
});

test('returns 404 for a recipe id that does not exist', async () => {
  const res = await fetch(`${baseUrl}/api/recipes/999999`);
  assert.equal(res.status, 404);
});
