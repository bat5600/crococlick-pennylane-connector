'use strict';

const { encrypt, decrypt } = require('./crypto');

const connections = new Map();

const saveConnection = (userId, payload) => {
  const now = new Date();
  const record = {
    userId,
    ghlAccountId: payload.ghlAccountId || null,
    ghlLocationId: payload.ghlLocationId || null,
    encryptedAccessToken: encrypt(payload.accessToken),
    encryptedRefreshToken: encrypt(payload.refreshToken),
    scopes: payload.scopes || [],
    tokenType: payload.tokenType || 'Bearer',
    expiresAt: payload.expiresAt,
    createdAt: now,
    updatedAt: now,
    isActive: true
  };
  connections.set(userId, record);
  return record;
};

const getConnection = (userId) => connections.get(userId) || null;

const deleteConnection = (userId) => {
  connections.delete(userId);
};

const updateTokens = (userId, payload) => {
  const existing = connections.get(userId);
  if (!existing) {
    return null;
  }
  existing.encryptedAccessToken = encrypt(payload.accessToken);
  if (payload.refreshToken) {
    existing.encryptedRefreshToken = encrypt(payload.refreshToken);
  }
  existing.expiresAt = payload.expiresAt;
  existing.updatedAt = new Date();
  return existing;
};

const decryptAccessToken = (record) => decrypt(record.encryptedAccessToken);
const decryptRefreshToken = (record) => decrypt(record.encryptedRefreshToken);

module.exports = {
  saveConnection,
  getConnection,
  deleteConnection,
  updateTokens,
  decryptAccessToken,
  decryptRefreshToken
};
