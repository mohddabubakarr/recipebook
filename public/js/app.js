const API = {
  search: (q, by) => fetch(`/api/mealdb/search?q=${encodeURIComponent(q)}&by=${by}`).then(parseJSON),
  featured: (count = 8) => fetch(`/api/mealdb/featured?count=${count}`).then(parseJSON),
  detail: (id) => fetch(`/api/mealdb/${id}`).then(parseJSON),
  collection: () => fetch('/api/recipes').then(parseJSON),
  save: (payload) =>
    fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(parseJSON),
  remove: (id) => fetch(`/api/recipes/${id}`, { method: 'DELETE' }),
};

async function parseJSON(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---- Tab navigation ----
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function goToTab(name) {
  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  tabPanels.forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'collection') loadCollection();
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => goToTab(btn.dataset.tab));
});

// ---- Logo / home ----
document.getElementById('logo-home').addEventListener('click', () => {
  goToTab('search');
  resetSearch();
});

// ---- Search ----
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchBy = document.getElementById('search-by');
const searchStatus = document.getElementById('search-status');
const searchResults = document.getElementById('search-results');
const searchHero = document.getElementById('search-hero');
const featuredSection = document.getElementById('featured-section');
const featuredResults = document.getElementById('featured-results');

function resetSearch() {
  searchForm.reset();
  searchResults.innerHTML = '';
  searchStatus.textContent = '';
  searchStatus.classList.remove('error');
  searchHero.classList.remove('hidden');
  featuredSection.classList.remove('hidden');
  if (!featuredResults.children.length) loadFeatured();
}

async function loadFeatured() {
  featuredResults.innerHTML = '<p class="status-text">Loading featured recipes...</p>';
  try {
    const { results } = await API.featured(8);
    featuredResults.innerHTML = '';
    featuredResults.append(...results.map((r) => renderCard(r, 'search')));
  } catch (err) {
    featuredResults.innerHTML = `<p class="status-text error">${err.message}</p>`;
  }
}

async function runSearch(q, by) {
  searchInput.value = q;
  searchBy.value = by;
  searchHero.classList.add('hidden');
  featuredSection.classList.add('hidden');
  setStatus(searchStatus, 'Searching...', false);
  searchResults.innerHTML = '';

  try {
    const { results } = await API.search(q, by);
    if (!results.length) {
      setStatus(searchStatus, `No recipes found for "${q}".`, false);
      return;
    }
    setStatus(searchStatus, `${results.length} recipe(s) found.`, false);
    searchResults.append(...results.map((r) => renderCard(r, 'search')));
  } catch (err) {
    setStatus(searchStatus, err.message, true);
  }
}

loadFeatured();

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  runSearch(q, searchBy.value);
});

document.getElementById('quick-searches').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  runSearch(chip.dataset.q, 'name');
});

// ---- Collection ----
const collectionStatus = document.getElementById('collection-status');
const collectionResults = document.getElementById('collection-results');

async function loadCollection() {
  setStatus(collectionStatus, 'Loading your collection...', false);
  collectionResults.innerHTML = '';
  try {
    const { results } = await API.collection();
    if (!results.length) {
      setStatus(collectionStatus, 'Your collection is empty. Search for recipes or add your own!', false);
      return;
    }
    setStatus(collectionStatus, `${results.length} recipe(s) saved.`, false);
    collectionResults.append(...results.map((r) => renderCard(r, 'collection')));
  } catch (err) {
    setStatus(collectionStatus, err.message, true);
  }
}

// ---- Custom recipe form ----
const customForm = document.getElementById('custom-form');
const customStatus = document.getElementById('custom-status');
const customTitle = document.getElementById('custom-title');
const customCategory = document.getElementById('custom-category');
const customArea = document.getElementById('custom-area');
const customImage = document.getElementById('custom-image');
const customInstructions = document.getElementById('custom-instructions');
const instructionsCount = document.getElementById('instructions-count');
const ingredientRows = document.getElementById('ingredient-rows');

// ---- Dynamic ingredient rows ----
function addIngredientRow(measure = '', ingredient = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';

  const measureInput = document.createElement('input');
  measureInput.type = 'text';
  measureInput.className = 'ing-measure';
  measureInput.placeholder = 'Amount (e.g. 200g)';
  measureInput.value = measure;
  measureInput.addEventListener('input', updatePreview);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'ing-name';
  nameInput.placeholder = 'Ingredient (e.g. Red Lentils)';
  nameInput.value = ingredient;
  nameInput.addEventListener('input', updatePreview);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'ing-remove';
  removeBtn.setAttribute('aria-label', 'Remove ingredient');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    row.remove();
    updatePreview();
  });

  row.appendChild(measureInput);
  row.appendChild(nameInput);
  row.appendChild(removeBtn);
  ingredientRows.appendChild(row);
  return row;
}

document.getElementById('add-ingredient-row').addEventListener('click', () => {
  const row = addIngredientRow();
  row.querySelector('.ing-measure').focus();
});

function getIngredients() {
  return Array.from(ingredientRows.querySelectorAll('.ingredient-row'))
    .map((row) => ({
      measure: row.querySelector('.ing-measure').value.trim(),
      ingredient: row.querySelector('.ing-name').value.trim(),
    }))
    .filter((i) => i.ingredient);
}

function resetCustomForm() {
  customForm.reset();
  ingredientRows.innerHTML = '';
  addIngredientRow();
  addIngredientRow();
  addIngredientRow();
  updatePreview();
}

// ---- Live preview ----
const previewImage = document.getElementById('preview-image');
const previewTitle = document.getElementById('preview-title');
const previewTags = document.getElementById('preview-tags');
const previewIngCount = document.getElementById('preview-ingredient-count');

function updatePreview() {
  previewTitle.textContent = customTitle.value.trim() || 'Your recipe title';

  previewImage.innerHTML = '';
  const url = customImage.value.trim();
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Preview';
    img.onerror = () => {
      previewImage.innerHTML = '<span>Image failed to load</span>';
    };
    previewImage.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = 'No image yet';
    previewImage.appendChild(span);
  }

  previewTags.innerHTML = '';
  const category = customCategory.value.trim();
  const area = customArea.value.trim();
  if (category) previewTags.appendChild(makeTag(category));
  if (area) previewTags.appendChild(makeTag(area));

  const count = getIngredients().length;
  previewIngCount.textContent = `${count} ingredient${count === 1 ? '' : 's'}`;

  instructionsCount.textContent = customInstructions.value.length;
}

[customTitle, customCategory, customArea, customImage].forEach((el) =>
  el.addEventListener('input', updatePreview)
);
customInstructions.addEventListener('input', updatePreview);

resetCustomForm();

customForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = customTitle.value.trim();
  const category = customCategory.value.trim();
  const area = customArea.value.trim();
  const image = customImage.value.trim();
  const ingredients = getIngredients();
  const instructions = customInstructions.value.trim();

  if (!ingredients.length) {
    setStatus(customStatus, 'Add at least one ingredient.', true);
    return;
  }

  try {
    await API.save({ source: 'custom', title, category, area, image, ingredients, instructions });
    setStatus(customStatus, `"${title}" saved to My Recipes!`, false);
    resetCustomForm();
  } catch (err) {
    setStatus(customStatus, err.message, true);
  }
});

// ---- Card rendering ----
function renderCard(recipe, context) {
  const card = document.createElement('div');
  card.className = 'recipe-card';

  const img = document.createElement('img');
  img.src = recipe.image || 'img/placeholder.svg';
  img.alt = recipe.title;
  img.loading = 'lazy';
  card.appendChild(img);

  const body = document.createElement('div');
  body.className = 'recipe-card-body';

  const h3 = document.createElement('h3');
  h3.textContent = recipe.title;
  body.appendChild(h3);

  const tags = document.createElement('div');
  tags.className = 'recipe-tags';
  if (recipe.category) tags.appendChild(makeTag(recipe.category));
  if (recipe.area) tags.appendChild(makeTag(recipe.area));
  if (context === 'collection' && recipe.source === 'custom') {
    const t = makeTag('Custom');
    t.classList.add('custom');
    tags.appendChild(t);
  }
  body.appendChild(tags);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'secondary';
  viewBtn.textContent = 'View Details';
  viewBtn.addEventListener('click', () => openDetail(recipe, context));
  actions.appendChild(viewBtn);

  if (context === 'search') {
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await API.save({
          source: 'mealdb',
          externalId: recipe.externalId,
          title: recipe.title,
          category: recipe.category,
          area: recipe.area,
          image: recipe.image,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        });
        saveBtn.textContent = 'Saved ✓';
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        alert(err.message);
      }
    });
    actions.appendChild(saveBtn);
  }

  if (context === 'collection') {
    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Remove "${recipe.title}" from your collection?`)) return;
      try {
        await API.remove(recipe.id);
        card.remove();
      } catch (err) {
        alert(err.message);
      }
    });
    actions.appendChild(delBtn);
  }

  body.appendChild(actions);
  card.appendChild(body);
  return card;
}

function makeTag(text) {
  const span = document.createElement('span');
  span.className = 'recipe-tag';
  span.textContent = text;
  return span;
}

function setStatus(el, message, isError) {
  el.textContent = message;
  el.classList.toggle('error', Boolean(isError));
}

// ---- Detail modal ----
const modal = document.getElementById('recipe-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

async function openDetail(recipe, context) {
  let full = recipe;
  if (context === 'search' && (!recipe.instructions || !recipe.ingredients.length)) {
    try {
      full = await API.detail(recipe.externalId);
    } catch (err) {
      alert(err.message);
      return;
    }
  }

  modalBody.innerHTML = '';

  if (full.image) {
    const hero = document.createElement('div');
    hero.className = 'modal-hero';
    const img = document.createElement('img');
    img.src = full.image;
    img.alt = full.title;
    hero.appendChild(img);
    const overlay = document.createElement('div');
    overlay.className = 'modal-hero-overlay';
    const h2 = document.createElement('h2');
    h2.textContent = full.title;
    overlay.appendChild(h2);
    hero.appendChild(overlay);
    modalBody.appendChild(hero);
  } else {
    const h2 = document.createElement('h2');
    h2.textContent = full.title;
    modalBody.appendChild(h2);
  }

  const tags = document.createElement('div');
  tags.className = 'recipe-tags modal-tags';
  if (full.category) tags.appendChild(makeTag(full.category));
  if (full.area) tags.appendChild(makeTag(full.area));
  const ingCount = (full.ingredients || []).length;
  if (ingCount) tags.appendChild(makeTag(`${ingCount} ingredients`));
  modalBody.appendChild(tags);

  const grid = document.createElement('div');
  grid.className = 'modal-grid';

  const ingColumn = document.createElement('div');
  ingColumn.className = 'modal-column';
  const h4a = document.createElement('h4');
  h4a.textContent = 'Ingredients';
  ingColumn.appendChild(h4a);
  const ul = document.createElement('ul');
  ul.className = 'ingredient-list';
  (full.ingredients || []).forEach((ing, i) => {
    const li = document.createElement('li');
    li.className = 'ingredient-item';
    const id = `ing-${i}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = [ing.measure, ing.ingredient].filter(Boolean).join(' ');
    checkbox.addEventListener('change', () => li.classList.toggle('checked', checkbox.checked));
    li.appendChild(checkbox);
    li.appendChild(label);
    ul.appendChild(li);
  });
  ingColumn.appendChild(ul);
  grid.appendChild(ingColumn);

  const stepColumn = document.createElement('div');
  stepColumn.className = 'modal-column';
  const h4b = document.createElement('h4');
  h4b.textContent = 'Instructions';
  stepColumn.appendChild(h4b);
  const steps = splitInstructions(full.instructions);
  if (steps.length) {
    const ol = document.createElement('ol');
    ol.className = 'step-list';
    steps.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      li.addEventListener('click', () => li.classList.toggle('done'));
      ol.appendChild(li);
    });
    stepColumn.appendChild(ol);
  } else {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No instructions provided.';
    stepColumn.appendChild(p);
  }
  grid.appendChild(stepColumn);

  modalBody.appendChild(grid);

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modalBody.scrollTop = 0;
}

function splitInstructions(text) {
  if (!text) return [];
  const numbered = text.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length > 1) return numbered.map((s) => s.replace(/^(step\s*)?\d+[.)]\s*/i, ''));
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}
