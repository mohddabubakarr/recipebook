const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:3000';
const OUT = __dirname;

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('saved', name);
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();

  // --- Desktop search results ---
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.type('#search-input', 'chicken');
  await page.click('#search-form button[type="submit"]');
  await page.waitForSelector('.recipe-card', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, '01-desktop-search.png');

  // --- Desktop recipe detail modal ---
  await page.click('.recipe-card .card-actions button.secondary');
  await page.waitForSelector('#recipe-modal:not(.hidden)');
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '02-desktop-detail.png');
  await page.click('#modal-close');

  // --- Save one, then a second recipe, then go to collection ---
  const saveButtons = await page.$$('.recipe-card .card-actions button:not(.secondary)');
  await saveButtons[0].click();
  await new Promise((r) => setTimeout(r, 500));
  await saveButtons[1].click();
  await new Promise((r) => setTimeout(r, 500));

  // --- Desktop add custom recipe ---
  await page.click('.tab-btn[data-tab="add"]');
  await page.type('#custom-title', "Spiced Chickpea Curry");
  await page.type('#custom-category', 'Curry');
  await page.type('#custom-area', 'Pakistani');
  await page.type('#custom-ingredients', '2 cans Chickpeas\n1 Onion, diced\n2 tbsp Curry powder\n1 cup Coconut milk');
  await page.type('#custom-instructions', 'Saute onion, add curry powder, stir in chickpeas and coconut milk, simmer 15 minutes.');
  await shot(page, '03-desktop-add-custom.png');
  await page.click('#custom-form button[type="submit"]');
  await new Promise((r) => setTimeout(r, 500));

  // --- Desktop collection (My Recipes) ---
  await page.click('.tab-btn[data-tab="collection"]');
  await page.waitForSelector('.recipe-card');
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '04-desktop-collection.png');

  // --- Mobile responsive views ---
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await shot(page, '05-mobile-home.png');

  await page.type('#search-input', 'chicken');
  await page.click('#search-form button[type="submit"]');
  await page.waitForSelector('.recipe-card', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, '06-mobile-search.png');

  await page.click('.tab-btn[data-tab="collection"]');
  await page.waitForSelector('.recipe-card');
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '07-mobile-collection.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
