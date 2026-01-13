'use strict';

const express = require('express');
const crypto = require('crypto');
const config = require('../config');

const router = express.Router();

const verifySignature = (req) => {
  if (!config.webhookSecret) {
    return true;
  }
  const signature = req.header('x-ghl-signature');
  if (!signature) {
    return false;
  }
  const payload = JSON.stringify(req.body || {});
  const digest = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

router.post('/ghl', (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body || {};
  if (!event) {
    return res.status(400).json({ error: 'Missing event' });
  }

  // TODO: map events to CrocoClick domain logic.
  console.log('GHL webhook received', { event, data });

  return res.json({ ok: true });
});

module.exports = router;
