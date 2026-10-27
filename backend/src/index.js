const { createApp } = require('./app');
const { port } = require('./config/env');

const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}`);
});
