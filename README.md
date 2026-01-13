# CrocoClick -> GoHighLevel Connector (MVP scaffold)

Minimal backend scaffold for OAuth 2.0 auth, token encryption, basic GHL API calls, and webhook intake. This is a starting point for the connector described in `CrocoClick-GHL-Connector-Guide.md`.

## What is included
- OAuth init/callback/disconnect endpoints
- Token encryption with AES-256-GCM
- Access token refresh flow
- GHL API proxy endpoints for contacts/workflows/calendars
- Webhook receiver with optional HMAC check
- In-memory token store (placeholder for real DB)

## Quick start
1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies: `npm install`
3. Start server: `npm start`

## Endpoints
- `POST /auth/ghl/init`
  - Requires `x-user-id` header (placeholder until you plug real auth)
  - Returns `{ url }` to redirect the browser
- `GET /auth/ghl/callback`
  - OAuth redirect URI
- `POST /auth/ghl/disconnect`
  - Requires `x-user-id`
- `GET /api/ghl/contacts`
- `POST /api/ghl/contacts`
- `PUT /api/ghl/contacts/:id`
- `GET /api/ghl/workflows`
- `GET /api/ghl/calendars`
- `POST /webhooks/ghl`

## Notes / TODO
- Replace `x-user-id` header with your real CrocoClick auth context.
- Replace in-memory token store with Postgres/Mongo model.
- Confirm actual GHL token response fields (account/location IDs).
- Add request validation and per-user rate limiting.
- Implement webhook event handling.

## Expected DB schema (example)
```
Table: ghl_connections
- user_id (string)
- ghl_account_id (string)
- ghl_location_id (string)
- encrypted_access_token (string)
- encrypted_refresh_token (string)
- expires_at (timestamp)
- scopes (string[])
- created_at (timestamp)
- updated_at (timestamp)
- is_active (boolean)
```

## Manual steps you must do
- Create GHL Marketplace developer account and app
- Configure OAuth redirect URI to `BASE_URL/auth/ghl/callback`
- Provide `GHL_CLIENT_ID` / `GHL_CLIENT_SECRET`
- Confirm scopes and supported webhook signature header
- Set up HTTPS for production
- Set up database and migrate token store

