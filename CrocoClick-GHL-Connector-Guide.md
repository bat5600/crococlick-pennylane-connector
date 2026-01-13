# 🔌 GUIDE COMPLET: DÉVELOPPEMENT DU CONNECTEUR CROCOCLICK → GHL

**Date:** 13 Janvier 2025  
**Statut:** 🟢 En préparation  
**Version:** 1.0 (MVP Planning)  
**Durée estimée:** 6-8 semaines | **Équipe:** 1-2 devs backend + 1 frontend

---

## 📋 RÉSUMÉ EXÉCUTIF

Ce guide documente la création d'un **connecteur sécurisé** permettant aux utilisateurs CrocoClick de connecter leurs comptes GoHighLevel (GHL) directement depuis la plateforme CrocoClick.

**Objectifs clés:**
- ✅ Authentification OAuth 2.0 (sécurité & compliance)
- ✅ Synchronisation bidirectionnelle des données
- ✅ Intégration seamless dans l'UX CrocoClick
- ✅ Webhooks temps réel pour les mises à jour
- ✅ Listing sur le GHL Marketplace

---

## 🏗️ ARCHITECTURE TECHNIQUE

### 1️⃣ Flux OAuth 2.0 (Authorization Code Flow)

```
┌──────────────────────────────────┐
│ Utilisateur CrocoClick           │
└──────────────┬───────────────────┘
               │ 1. Clique "Connecter GHL"
               ▼
       ┌─────────────────────────────────────┐
       │ CrocoClick Frontend                 │
       │ → Redirect to OAuth init            │
       └──────────────┬──────────────────────┘
                      │ 2. POST /auth/ghl/init
                      ▼
       ┌──────────────────────────────────────────┐
       │ GHL Marketplace OAuth Server            │
       │ (authorize?client_id=...&...)           │
       └──────────────┬───────────────────────────┘
                      │ 3. User authenticates & approves
                      │ 4. Redirect back with CODE
                      ▼
       ┌──────────────────────────────────────────┐
       │ CrocoClick Backend                      │
       │ /auth/ghl/callback?code=XXX             │
       │ → Exchange code for ACCESS_TOKEN        │
       │ → Store token (encrypted)               │
       │ → Redirect to dashboard                 │
       └──────────────────────────────────────────┘
```

### Étapes Détaillées

**Étape 1: Initiation du flux OAuth**
```
https://marketplace.gohighlevel.com/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://api.crococlick.com/oauth/callback
  &scope=contacts.r+contacts.w+workflows.r+workflows.w+calendars.r
  &state=random_csrf_token_12345
```

**Étape 2: Utilisateur s'authentifie chez GHL**
- Connexion avec identifiants GHL
- Approbation des permissions (scopes)
- GHL redirige vers votre `redirect_uri`

**Étape 3: Récupération du code**
```
https://api.crococlick.com/oauth/callback
  ?code=AUTH_CODE_FROM_GHL
  &state=random_csrf_token_12345
```

**Étape 4: Échange du code contre un token (Backend)**
```bash
curl -X POST https://marketplace.gohighlevel.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE_FROM_GHL" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://api.crococlick.com/oauth/callback"
```

**Réponse (Token):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Étape 5: Stockage sécurisé**
- Chiffrer `access_token` et `refresh_token`
- Stocker dans BD avec: `user_id`, `ghl_account_id`, `encrypted_tokens`, `expires_at`
- Lier à la session utilisateur CrocoClick

---

### 2️⃣ Scopes OAuth Recommandés

| Scope | Description | Type | Priorité |
|-------|-------------|------|----------|
| `contacts.r` | Lire les contacts | Lecture | 🔴 HAUTE |
| `contacts.w` | Créer/modifier contacts | Écriture | 🔴 HAUTE |
| `workflows.r` | Lire les workflows/automations | Lecture | 🔴 HAUTE |
| `workflows.w` | Créer/modifier workflows | Écriture | 🟡 MOYENNE |
| `campaigns.r` | Lire les campagnes | Lecture | 🟡 MOYENNE |
| `calendars.r` | Lire calendriers/RDV | Lecture | 🟡 MOYENNE |
| `emails.r` | Lire emails | Lecture | 🔵 BASSE |
| `sms.r` | Lire SMS | Lecture | 🔵 BASSE |
| `users.r` | Lire utilisateurs du compte | Lecture | 🟡 MOYENNE |
| `businesses.r` | Info du business/compte | Lecture | 🟡 MOYENNE |

**MVP Phase 1 (recommandé):**
```
contacts.r contacts.w workflows.r calendars.r
```

**Élargissement Phase 2:**
```
Add: workflows.w campaigns.r emails.r sms.r
```

---

### 3️⃣ Points d'Intégration CrocoClick ↔ GHL

#### A) Synchronisation des Contacts

**Cas d'usage 1: Créer contact depuis CrocoClick**
```javascript
// POST /api/ghl/contacts
const createContact = async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;
  const { ghl_access_token } = req.user; // Token de l'utilisateur
  
  const response = await fetch(
    'https://marketplace.gohighlevel.com/api/v1/contacts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghl_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        source: 'CrocoClick',
        tags: ['croco-sync']
      })
    }
  );
  
  const contact = await response.json();
  res.json(contact);
};
```

**Cas d'usage 2: Lire contacts depuis GHL**
```javascript
// GET /api/ghl/contacts?limit=50&offset=0
const getGHLContacts = async (req, res) => {
  const { ghl_access_token } = req.user;
  const { limit = 50, offset = 0 } = req.query;
  
  const response = await fetch(
    `https://marketplace.gohighlevel.com/api/v1/contacts?limit=${limit}&skip=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${ghl_access_token}`,
      }
    }
  );
  
  const { data } = await response.json();
  res.json({ contacts: data, total: data.length });
};
```

#### B) Synchronisation des Workflows

**Lire workflows disponibles:**
```javascript
// GET /api/ghl/workflows
const getGHLWorkflows = async (req, res) => {
  const { ghl_access_token } = req.user;
  
  const response = await fetch(
    'https://marketplace.gohighlevel.com/api/v1/workflows',
    {
      headers: {
        'Authorization': `Bearer ${ghl_access_token}`,
      }
    }
  );
  
  const workflows = await response.json();
  res.json(workflows);
};
```

#### C) Webhooks Temps Réel

**Configuration webhook chez GHL:**
```
URL: https://api.crococlick.com/webhooks/ghl
Événements à écouter:
- contact.created
- contact.updated
- workflow.triggered
- workflow.completed
```

**Traitement webhook (CrocoClick):**
```javascript
// POST /webhooks/ghl
const handleGHLWebhook = async (req, res) => {
  const { event, data } = req.body;
  
  // Vérifier signature GHL (si disponible)
  if (!verifyGHLSignature(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  switch(event) {
    case 'contact.created':
      // Synchroniser le contact dans BD CrocoClick
      await syncContactToCroco(data);
      break;
    case 'contact.updated':
      await updateContactInCroco(data);
      break;
    // ... autres events
  }
  
  res.json({ success: true });
};
```

---

### 4️⃣ Gestion Sécurisée des Tokens

#### ❌ MAUVAISES PRATIQUES

```javascript
// NEVER DO THIS
localStorage.setItem('ghl_token', token); // Exposé au XSS
session.setItem('ghl_secret', clientSecret); // Exposé
db.save({ access_token: token }); // En clair en base
```

#### ✅ BONNES PRATIQUES

**1. Chiffrement avec crypto:**
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Store in vault!

const encryptToken = (token) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
};

const decryptToken = (encryptedData) => {
  const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

**2. Stockage en base:**
```javascript
// Schéma DB (MongoDB)
const GHLConnectionSchema = {
  user_id: ObjectId,
  ghl_account_id: String,
  ghl_location_id: String,
  encrypted_access_token: String, // Encrypted
  encrypted_refresh_token: String, // Encrypted
  expires_at: Date,
  created_at: Date,
  updated_at: Date,
  is_active: Boolean,
  scopes: [String] // Pour tracer les permissions
};
```

**3. Refresh automatique du token:**
```javascript
const ensureValidToken = async (userId) => {
  const connection = await GHLConnection.findOne({ user_id: userId });
  
  if (new Date() > connection.expires_at) {
    // Token expiré → refresh
    const refreshToken = decryptToken(connection.encrypted_refresh_token);
    
    const response = await fetch(
      'https://marketplace.gohighlevel.com/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.GHL_CLIENT_ID,
          client_secret: process.env.GHL_CLIENT_SECRET
        })
      }
    );
    
    const { access_token, expires_in } = await response.json();
    
    // Mettre à jour la BD
    connection.encrypted_access_token = encryptToken(access_token);
    connection.expires_at = new Date(Date.now() + expires_in * 1000);
    await connection.save();
  }
  
  return decryptToken(connection.encrypted_access_token);
};
```

---

## ✅ CHECKLIST DE DÉVELOPPEMENT

### Phase 1: Préparation (Semaine 1)

#### GHL Marketplace Setup
- [ ] Créer compte developer GHL Marketplace
- [ ] Créer nouvelle "application" dans GHL
- [ ] Copier `CLIENT_ID` et `CLIENT_SECRET`
- [ ] Configurer `redirect_uri`:
  - Dev: `http://localhost:3000/oauth/callback`
  - Prod: `https://api.crococlick.com/oauth/callback`
- [ ] Enregistrer les scopes initiaux
- [ ] Lire docs complètes: https://marketplace.gohighlevel.com/docs/oauth/GettingStarted

#### Infrastructure
- [ ] Créer table/collection `ghl_connections` en DB
- [ ] Configurer chiffrement (clé dans vault/secrets)
- [ ] Configurer variables d'environnement
- [ ] Préparer serveur OAuth (Express, FastAPI, etc.)

#### Documentation Interne
- [ ] Documenter flow OAuth
- [ ] Créer diagrammes d'architecture
- [ ] Lister endpoints à développer

### Phase 2: Implémentation OAuth (Semaines 2-3)

#### Backend
- [ ] Créer endpoint `/auth/ghl/init`
  - Générer `state` (CSRF token)
  - Construire URL OAuth GHL
  - Rediriger utilisateur
  
- [ ] Créer endpoint `/auth/ghl/callback`
  - Recevoir `code` et `state`
  - Valider `state` (protection CSRF)
  - Échanger `code` contre `access_token`
  - Chiffrer et stocker tokens
  - Rediriger vers dashboard
  
- [ ] Créer endpoint `/auth/ghl/disconnect`
  - Supprimer la connexion
  - Nettoyer tokens
  
- [ ] Tests unitaires des endpoints OAuth

#### Frontend
- [ ] Créer bouton "Connecter GHL"
  - Ajouter à: `/dashboard/integrations`
  - Styling cohérent avec design CrocoClick
  
- [ ] Ajouter gestion des erreurs
  - User cancelled: afficher message
  - Erreur technique: retry button
  - Succès: feedback visual
  
- [ ] Tests manuels end-to-end

#### Sécurité
- [ ] Configurer HTTPS en dev (self-signed OK)
- [ ] Valider CSRF tokens
- [ ] Tests de pénétration OAuth flow

### Phase 3: Synchronisation (Semaines 4-6)

#### Lecture des données GHL
- [ ] Endpoint `GET /api/ghl/contacts` avec pagination
- [ ] Endpoint `GET /api/ghl/workflows`
- [ ] Endpoint `GET /api/ghl/calendars`
- [ ] Ajouter caching (Redis) pour perf
- [ ] Tests avec différentes tailles de données

#### Création/Modification
- [ ] Endpoint `POST /api/ghl/contacts`
- [ ] Endpoint `PUT /api/ghl/contacts/:id`
- [ ] Valider données avant envoi à GHL
- [ ] Gestion des erreurs GHL

#### Webhooks (optionnel Phase 1, recommandé)
- [ ] Enregistrer webhook chez GHL (via API)
- [ ] Créer endpoint `/webhooks/ghl` qui reçoit events
- [ ] Parser events et mettre à jour CrocoClick DB
- [ ] Tests avec simulations d'events

#### Tests d'intégration
- [ ] Créer contact CrocoClick → vérifier GHL
- [ ] Créer contact GHL → voir synchronisé CrocoClick
- [ ] Modifier contact → les deux côtés à jour

### Phase 4: Optimisation & Robustesse (Semaine 7)

#### Performance
- [ ] Implémenter rate limiting (GHL: ~50 req/min)
- [ ] Ajouter queue pour bulk operations
- [ ] Optimiser queries BD
- [ ] Compression réponses API

#### Résilience
- [ ] Gestion tokens expirés → auto-refresh
- [ ] Retry exponential backoff pour erreurs
- [ ] Circuit breaker si GHL down
- [ ] Logging complet de tous les appels API

#### Monitoring
- [ ] Dashboard health check (% succès sync)
- [ ] Alertes sur erreurs critiques
- [ ] Logs centralisés (Sentry, DataDog)
- [ ] Métriques: latency, error rate, sync time

#### GDPR & Sécurité
- [ ] Droit à la déconnexion (supprimer tokens)
- [ ] Droit à l'oubli (purger données)
- [ ] Audit trail (log qui a déconnecté quand)
- [ ] Encryption en transit (HTTPS)
- [ ] Encryption au repos (tokens chiffrés)

### Phase 5: Documentation & Launch (Semaine 8)

#### Documentation Utilisateur
- [ ] Article Help Center: "Connecter GHL à CrocoClick"
- [ ] Screenshots/vidéo du processus
- [ ] Troubleshooting FAQ
- [ ] Support contact email

#### GHL Marketplace
- [ ] Créer listing sur marketplace
- [ ] Screenshots attrayants
- [ ] Description complète features
- [ ] Guide d'installation
- [ ] Testimonials/ratings

#### Formation Support
- [ ] Onboarding CrocAssist
- [ ] Runbook déconnexion/reconnexion
- [ ] Escalade technique pour bugs
- [ ] Knowledgebase internal

#### Release
- [ ] Soft launch (utilisateurs beta)
- [ ] Feedback collecte
- [ ] Bug fixes
- [ ] Public launch
- [ ] Communication communauté

---

## 🖇️ RESSOURCES TECHNIQUES

### Documentation Officielle

- 📖 **GHL OAuth Docs**: https://marketplace.gohighlevel.com/docs/oauth/GettingStarted
- 📖 **GHL API Reference**: https://marketplace.gohighlevel.com/docs/api/
- 📖 **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- 📖 **PKCE RFC 7636**: https://tools.ietf.org/html/rfc7636 (pour SPAs)

### Stack Recommandé

#### Backend
```
Node.js/Express (votre actuel)
├── axios (HTTP client)
├── crypto (Node.js native)
├── jsonwebtoken (JWT si besoin)
├── dotenv (env vars)
├── cors (CORS handling)
└── morgan (logging)
```

#### Base de données
```
Postgres ou MongoDB
├── Table: ghl_connections
├── Table: ghl_contacts (cache)
├── Table: ghl_workflows (cache)
└── Indexes sur user_id, created_at
```

#### Frontend (React)
```
React/Next.js (votre setup)
├── axios
├── React Query (data fetching)
├── Zustand/Redux (state)
└── Tailwind (styling)
```

### Librairies Recommandées

| Package | Raison | Alternatives |
|---------|--------|--------------|
| `axios` | HTTP client simple | fetch, node-fetch |
| `crypto` (Node.js) | Chiffrement natif | libsodium.js |
| `jsonwebtoken` | JWT signing | aucune (si besoin custom) |
| `redis` | Cache | memcached, in-memory |
| `passport-oauth2` | OAuth strategy | custom implementation |
| `helmet` | Sécurité headers | custom |

---

## 🔐 Considérations de Sécurité

### Checklist Sécurité

- [ ] HTTPS obligatoire en prod
- [ ] Validation des URLs (redirect_uri)
- [ ] CSRF tokens pour chaque requête OAuth
- [ ] Chiffrement des tokens au repos
- [ ] Rate limiting sur endpoints
- [ ] Input validation/sanitization
- [ ] SQL injection prevention (ORM recommandé)
- [ ] Logs ne contiennent pas tokens
- [ ] Rotation clés chiffrement régulièrement
- [ ] Audit trail complet
- [ ] Secrets en vault (pas en git!)

### Commandes utiles (Node.js)

```javascript
// Générer ENCRYPTION_KEY (256-bit pour AES-256)
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
console.log(key); // Copier dans .env

// Vérifier que token est bien chiffré
const encryptedExample = '...';
const parts = encryptedExample.split(':');
console.log(`IV: ${parts[0]}, Encrypted: ${parts[1]}, Tag: ${parts[2]}`);
```

---

## 📊 Métriques de Succès

Après 8 semaines, voici les KPIs à tracker:

| Métrique | Cible | Mesure |
|----------|--------|--------|
| % Connexions réussies | > 95% | Logging OAuth flow |
| Temps réponse API | < 500ms | APM tools |
| Uptime connecteur | > 99.5% | Monitoring |
| % Utilisateurs adoptants | > 20% | Analytics |
| Erreurs API | < 1% | Error tracking |
| Sync latency | < 1min | Webhook timing |

---

## 🚀 Prochaines Étapes

1. **Valider ce plan** avec l'équipe
2. **Créer dépôt Git** privé pour le développement
3. **Configurer GHL account** et récupérer credentials
4. **Kick-off semaine 1** avec l'équipe dev
5. **Weekly standups** pour tracking progress
6. **Beta testing semaine 6** avec utilisateurs pilotes

---

*Document Living | Version: 1.0 | Créé: 13 Jan 2025*  
*À mettre à jour régulièrement selon évolutions GHL API*
