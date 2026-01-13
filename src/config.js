'use strict';

const required = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const config = {
  port: Number(process.env.PORT || 3000),
  baseUrl: required('BASE_URL'),
  oauthSuccessRedirect: process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000/integrations/ghl',
  oauthErrorRedirect: process.env.OAUTH_ERROR_REDIRECT || 'http://localhost:3000/integrations/ghl?error=oauth',
  ghl: {
    clientId: required('GHL_CLIENT_ID'),
    clientSecret: required('GHL_CLIENT_SECRET'),
    oauthAuthorizeUrl: process.env.GHL_OAUTH_AUTHORIZE_URL || 'https://marketplace.gohighlevel.com/oauth/authorize',
    oauthTokenUrl: process.env.GHL_OAUTH_TOKEN_URL || 'https://marketplace.gohighlevel.com/oauth/token',
    apiBaseUrl: process.env.GHL_API_BASE_URL || 'https://marketplace.gohighlevel.com/api/v1',
    scopes: process.env.GHL_OAUTH_SCOPES || 'contacts.r contacts.w workflows.r calendars.r'
  },
  encryptionKeyHex: required('ENCRYPTION_KEY_HEX'),
  webhookSecret: process.env.GHL_WEBHOOK_SECRET || null
};

module.exports = config;
