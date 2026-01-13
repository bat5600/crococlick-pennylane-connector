'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const config = require('./config');
const authRoutes = require('./routes/auth');
const ghlRoutes = require('./routes/ghl');
const webhookRoutes = require('./routes/webhooks');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120
  })
);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'crococlick-ghl-connector' });
});

app.use('/auth', authRoutes);
app.use('/api/ghl', ghlRoutes);
app.use('/webhooks', webhookRoutes);

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`GHL connector listening on port ${config.port}`);
  });
}

module.exports = app;
