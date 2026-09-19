# My Recipe Box

Discover recipes. Save your favorites. Cook your own way.

A personal, ad-free recipe manager built for **Project Java and Web Development (DLBCSPJWD01)**.
Search a public recipe database for inspiration, save the ones you like, and add your own
custom recipes — all in one clutter-free place.

> This is a personal recipe tool for a single user, not a social network or recipe-sharing platform.

## Tech stack

| Layer      | Technology                                             |
|------------|---------------------------------------------------------|
| Front-end  | HTML, CSS, vanilla JavaScript (Fetch API)               |
| Back-end   | Node.js + Express                                       |
| Database   | SQLite (via `sqlite3`)                                  |
| External API | [TheMealDB](https://www.themealdb.com/api.php) (public test key, read-only) |

The front-end never calls TheMealDB directly. All external requests go through the Express
back-end, which fetches, simplifies, and transforms the data before sending it to the browser.
The same back-end stores saved/custom recipes in SQLite.

## Features

- **Search** — search TheMealDB by recipe name or by ingredient
- **View Details** — full ingredient list and instructions for any recipe
- **Save to My Recipes** — one click adds a searched recipe to your private collection
- **Add Custom Recipe** — create and store your own recipes
- **Manage Collection** — view and delete anything you've saved, anytime
- **Responsive design** — usable on phone, tablet, and desktop

## Project structure

```
recipebook/
├── public/              # Front-end (static, served by Express)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── server/
│   ├── server.js        # Entry point
│   ├── app.js            # Express app (routes, static files)
│   ├── db.js              # SQLite connection + schema
│   ├── mealdbClient.js     # TheMealDB API client
│   ├── routes/
│   │   ├── recipes.js      # CRUD for the saved/custom collection
│   │   └── mealdb.js        # Search/lookup proxy to TheMealDB
│   └── tests/
│       └── recipes.test.js  # Integration tests (node:test)
└── screenshots/          # App screenshots used in the phase 2 presentation
```

## Getting started

```bash
npm install
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Running tests

```bash
npm test
```

Runs the integration test suite (`node --test`) against an isolated, temporary SQLite database —
covering validation rules, saving, duplicate prevention, and deletion for the recipe collection.
See [Test cases](#test-cases) below for what each test verifies.

## API overview

| Method | Route                          | Description                                   |
|--------|---------------------------------|------------------------------------------------|
| GET    | `/api/mealdb/search?q=&by=`     | Search TheMealDB by `name` or `ingredient`      |
| GET    | `/api/mealdb/:id`                | Full detail for one external recipe             |
| GET    | `/api/recipes`                   | List everything in your saved collection        |
| GET    | `/api/recipes/:id`                | Get one saved/custom recipe                     |
| POST   | `/api/recipes`                    | Save a MealDB recipe or add a custom recipe     |
| DELETE | `/api/recipes/:id`                 | Remove a recipe from your collection            |

## Test cases

| # | Test | Input | Expected result |
|---|------|-------|------------------|
| 1 | Reject empty ingredients | Custom recipe, `ingredients: []` | `400` — "needs at least one ingredient" |
| 2 | Reject missing instructions | Custom recipe, `instructions: ""` | `400` — "needs instructions" |
| 3 | Reject MealDB save with no id | `source: "mealdb"`, no `externalId` | `400` — "externalId is required" |
| 4 | Save a valid custom recipe | Full custom recipe payload | `201`, appears in `GET /api/recipes` |
| 5 | Prevent duplicate saves | Same `externalId` saved twice | Second save returns `409` |
| 6 | Delete a saved recipe | `DELETE /api/recipes/:id` | `204`, then `GET` on that id returns `404` |
| 7 | Unknown recipe id | `GET /api/recipes/999999` | `404` |

All seven are automated in [`server/tests/recipes.test.js`](server/tests/recipes.test.js).
Search/lookup against the live TheMealDB API is verified manually (see the phase 2 slides).

## Changes since Phase 1 (Conception)

No changes to the planned tech stack or feature set — the implementation follows the
Phase 1 architecture (HTML/CSS/JS front-end → Express back-end → SQLite + TheMealDB) as proposed.

## Author

Gotam Rai — Matriculation No. 10246383 — Project Java and Web Development (DLBCSPJWD01)
