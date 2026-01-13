'use strict';

const express = require('express');
const axios = require('axios');
const config = require('../config');
const { createState, consumeState } = require('../lib/stateStore');
const { saveConnection, deleteConnection } = require('../lib/tokenStore');

const router = express.Router();

const getUserId = (req) => {
  const userId = req.header('x-user-id');
  if (!userId) {
    const err = new Error('Missing x-user-id header');
    err.statusCode = 401;
    throw err;
  }
  return userId;
};

router.post('/ghl/init', (req, res, next) => {
  try {
    const userId = getUserId(req);
    const state = createState(userId);
    const params = new URLSearchParams({
      client_id: config.ghl.clientId,
      redirect_uri: `${config.baseUrl}/auth/ghl/callback`,
      response_type: 'code',
      scope: config.ghl.scopes,
      state
    });

    const url = `${config.ghl.oauthAuthorizeUrl}?${params.toString()}`;
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.get('/ghl/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(config.oauthErrorRedirect);
  }

  const userId = consumeState(state);
  if (!userId) {
    return res.redirect(config.oauthErrorRedirect);
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      client_id: config.ghl.clientId,
      client_secret: config.ghl.clientSecret,
      redirect_uri: `${config.baseUrl}/auth/ghl/callback`
    });

    const tokenResponse = await axios.post(config.ghl.oauthTokenUrl, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = tokenResponse.data;
    const expiresAt = new Date(Date.now() + Number(data.expires_in) * 1000);

    saveConnection(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scopes: (data.scope || config.ghl.scopes).split(' '),
      tokenType: data.token_type || 'Bearer',
      ghlAccountId: data.ghl_account_id || null,
      ghlLocationId: data.locationId || null
    });

    return res.redirect(config.oauthSuccessRedirect);
  } catch (err) {
    return res.redirect(config.oauthErrorRedirect);
  }
});

router.post('/ghl/disconnect', (req, res, next) => {
  try {
    const userId = getUserId(req);
    deleteConnection(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
