'use strict';

const axios = require('axios');
const config = require('../config');
const {
  getConnection,
  updateTokens,
  decryptAccessToken,
  decryptRefreshToken
} = require('./tokenStore');

const tokenClient = axios.create({
  baseURL: config.ghl.oauthTokenUrl,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

const apiClient = axios.create({
  baseURL: config.ghl.apiBaseUrl,
  timeout: 15000
});

const refreshAccessToken = async (connection) => {
  const refreshToken = decryptRefreshToken(connection);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.ghl.clientId,
    client_secret: config.ghl.clientSecret
  });

  const response = await tokenClient.post('', body);
  const data = response.data;
  const expiresAt = new Date(Date.now() + Number(data.expires_in) * 1000);

  updateTokens(connection.userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt
  });

  return data.access_token;
};

const ensureValidAccessToken = async (userId) => {
  const connection = getConnection(userId);
  if (!connection || !connection.isActive) {
    const err = new Error('No active GHL connection');
    err.statusCode = 401;
    throw err;
  }

  if (new Date() < connection.expiresAt) {
    return decryptAccessToken(connection);
  }

  return refreshAccessToken(connection);
};

const request = async ({ userId, method, path, params, data }) => {
  const accessToken = await ensureValidAccessToken(userId);
  const response = await apiClient.request({
    method,
    url: path,
    params,
    data,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return response.data;
};

module.exports = {
  request,
  ensureValidAccessToken
};
