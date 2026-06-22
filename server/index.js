require('dotenv').config();

const app = require('./src/app');
const { startMidnightCron } = require('./src/jobs/midnightEndDay');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  startMidnightCron();
});
