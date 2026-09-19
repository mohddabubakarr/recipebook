const express = require('express');
const cors = require('cors');
const path = require('path');
const recipesRouter = require('./routes/recipes');
const mealdbRouter = require('./routes/mealdb');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/recipes', recipesRouter);
  app.use('/api/mealdb', mealdbRouter);

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  return app;
}

module.exports = createApp;
