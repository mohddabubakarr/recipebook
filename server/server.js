const createApp = require('./app');
const { init } = require('./db');

const PORT = process.env.PORT || 3000;
const app = createApp();

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`My Recipe Box server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
