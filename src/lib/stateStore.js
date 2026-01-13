'use strict';

const crypto = require('crypto');

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const store = new Map();

const createState = (userId) => {
  const state = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + DEFAULT_TTL_MS;
  store.set(state, { userId, expiresAt });
  return state;
};

const consumeState = (state) => {
  const entry = store.get(state);
  if (!entry) {
    return null;
  }
  store.delete(state);
  if (Date.now() > entry.expiresAt) {
    return null;
  }
  return entry.userId;
};

const purgeExpired = () => {
  const now = Date.now();
  for (const [state, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(state);
    }
  }
};

module.exports = { createState, consumeState, purgeExpired };
