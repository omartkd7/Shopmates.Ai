<h1 align="center">🛍️ ShopMate AI</h1>

<p align="center">
  <strong>Assistant conversationnel IA pour boutique e-commerce en paiement à la livraison (COD)</strong><br>
  Application mobile multi-tenant — RAG · Function Calling · MCP
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,ts,nodejs,expressjs,postgres,sequelize,docker,git,github,postman,figma,vscode&perline=6" alt="Stack technique" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/statut-en%20développement-yellow" alt="statut">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="version">
  <img src="https://img.shields.io/badge/licence-MIT-green" alt="licence">
  <img src="https://img.shields.io/badge/projet-Fil%20Rouge%202026-purple" alt="projet">
</p>

---

## 📑 Sommaire

- [À propos](#-à-propos)
- [Le problème](#-le-problème)
- [La solution](#-la-solution)
- [Fonctionnalités](#-fonctionnalités)
- [Comment fonctionne l'agent IA](#-comment-fonctionne-lagent-ia)
- [Les outils de l'agent](#-les-outils-de-lagent-function-calling)
- [Ce que l'agent refuse](#-ce-que-lagent-refuse-garde-fous)
- [Stack technique](#-stack-technique)
- [Architecture](#-architecture)
- [Modèle de données](#-modèle-de-données)
- [Démarrage rapide](#-démarrage-rapide)
- [Variables d'environnement](#-variables-denvironnement)
- [API REST](#-api-rest)
- [Exemple de conversation](#-exemple-de-conversation)
- [Sécurité](#-sécurité)
- [Déploiement](#-déploiement)
- [Feuille de route](#-feuille-de-route)
- [Auteur](#-auteur)

---

## 🎯 À propos

**ShopMate AI** est une application mobile de boutique en ligne dans laquelle un **assistant conversationnel intelligent est la fonctionnalité centrale**, pas un simple ajout.

Le client discute en langage naturel (français ou darija) : il pose ses questions sur les produits, la livraison ou les retours, **passe sa commande et la suit** — sans qu'aucun humain n'intervienne, 24h/24.

L'application est **multi-tenant** : chaque donnée est rattachée à un `storeId`, donc une même instance peut servir plusieurs boutiques. Le projet est ainsi extensible en véritable produit SaaS.

### Dernière mise à jour

La base du backend est maintenant structurée autour d'Express + TypeScript + PostgreSQL + pgvector + Sequelize, avec les modèles métier dans `backend/src/models` et le démarrage de l'API dans `backend/src/server.ts`.

> 🎓 Projet Fil Rouge — *Mobile Augmented AI* · Deadline : **24 octobre 2026**

---

## ❗ Le problème

Une boutique COD (très répandue au Maroc) fait face chaque jour à trois coûts cachés :

| Problème | Conséquence |
|---|---|
| 🔁 **Questions répétitives** — prix, tailles, disponibilité, délai et frais de livraison, retours | Le vendeur répond 100 fois par jour la même chose |
| 🌙 **Demandes hors horaires** — le soir et le week-end | Les ventes non traitées dans l'heure sont perdues |
| 📞 **Prise de commande manuelle** par téléphone | Temps perdu, erreurs de saisie, aucune traçabilité |

---

## 💡 La solution

ShopMate AI automatise **les deux tâches à la fois** :

1. **Répondre** — l'assistant puise dans les documents réels de la boutique (RAG), il n'invente pas.
2. **Agir** — l'assistant exécute de vraies opérations métier (function calling), toujours avec confirmation avant une écriture.

---

## ✨ Fonctionnalités

### Pour le client
- 🔐 Inscription, connexion, session sécurisée (JWT + refresh rotatif)
- 🛒 Catalogue produits avec recherche, filtres et fiche détaillée
- 💬 **Chat avec l'assistant IA**, réponse affichée mot par mot (streaming SSE)
- 📦 Passer une commande COD **directement dans la conversation**
- 🚚 Suivre l'état de sa commande et sa livraison
- 🗂️ Historique des conversations conservé

### Pour le gérant
- 📋 Gestion du catalogue (produits, catégories, stock, prix)
- 📄 Dépôt des documents de connaissance (FAQ, livraison, retours, guide des tailles)
- 🔍 Journal d'audit : chaque question, chaque outil appelé, chaque source citée
- 🏪 Isolation totale entre boutiques (`storeId`)

---

## 🧠 Comment fonctionne l'agent IA

L'agent combine **deux mécanismes volontairement séparés**. C'est le cœur du projet.

| | 📚 **RAG** — le savoir | ⚡ **Function Calling** — l'action |
|---|---|---|
| **Rôle** | Répondre à une question | Exécuter une opération réelle |
| **Source** | Documents vectorisés de la boutique | Base de données en direct |
| **Exemple** | « Vous livrez à Casablanca ? » | « Je la veux » → crée la commande |
| **Fraîcheur** | Statique (mise à jour par l'admin) | Temps réel |
| **Garde-fou** | Refus si aucun document pertinent | Confirmation avant toute écriture |

> **La règle simple : RAG = savoir. Function calling = faire.**

### Le pipeline RAG en 5 étapes

```
Document  →  Découpage (~800 car.)  →  Embedding (1536 dim.)  →  pgvector
                                                                     ↓
Réponse citée  ←  LLM + contexte  ←  Top 4–6 chunks (cosinus, HNSW, filtré par storeId)
```

### Le flux complet d'un message

```mermaid
sequenceDiagram
    participant U as 📱 Client (Expo)
    participant API as ⚙️ Backend Express
    participant DB as 🗄️ PostgreSQL + pgvector
    participant LLM as 🧠 LLM
    participant MCP as 🔌 Serveur MCP

    U->>API: POST /api/agent/chat (question) [SSE]
    API->>DB: embed(question) → top-k chunks (storeId)
    DB-->>API: contexte RAG
    API->>LLM: prompt système + contexte + historique + outils
    LLM-->>API: appel d'outil (ex. checkStock / createOrder)
    API->>DB: exécution (transaction si écriture)
    API->>MCP: (si besoin) getShipmentStatus
    API-->>U: réponse streamée token par token
    API->>DB: log d'audit (question, outils, sources)
```

---

## 🔧 Les outils de l'agent (function calling)

| Outil | Rôle | Confirmation | Endpoint |
|---|---|:---:|---|
| `searchProducts` | Rechercher des produits (mots-clés, filtres) | ❌ | `GET /api/products` |
| `getProductDetails` | Détail d'un produit | ❌ | `GET /api/products/:id` |
| `checkStock` | Stock et prix **en direct** | ❌ | `GET /api/products/:id/stock` |
| `createOrder` | Créer une commande COD | ✅ **Oui** | `POST /api/orders` |
| `getOrderStatus` | Statut d'une commande | ❌ | `GET /api/orders/:id` |
| `listMyOrders` | Commandes du client courant | ❌ | `GET /api/orders` |
| `cancelOrder` | Annuler une commande | ✅ **Oui** | `POST /api/orders/:id/cancel` |
| `getShipmentStatus` | Suivi transporteur *(via MCP)* | ❌ | Serveur MCP |

> ⚠️ **Le stock et le prix passent TOUJOURS par une fonction.** Ils ne sont jamais générés par le modèle.

---

## 🛡️ Ce que l'agent refuse (garde-fous)

| Risque | Protection mise en place |
|---|---|
| 🌀 **Hallucination** | Réponse fondée uniquement sur le contexte RAG ; si le score de similarité est trop faible → « Je n'ai pas cette information » |
| 💉 **Prompt injection** | Documents et résultats d'outils traités comme des **données**, jamais comme des instructions |
| ✍️ **Écriture non désirée** | Allowlist d'outils + validation Zod + confirmation explicite + transaction |
| 🏪 **Fuite entre boutiques** | `storeId` injecté côté serveur depuis le token, jamais accepté du client |
| 👤 **Accès aux données d'autrui** | L'agent ne lit que les commandes du client authentifié |
| 💸 **Abus / coût** | Rate limiting, plafond de tokens, max 3 appels d'outils par tour |

L'agent **refuse systématiquement** : modifier un prix, accorder une remise ou un remboursement, agir sur la commande d'un autre client, donner un conseil médical/juridique, sortir du domaine de la boutique.

---

## 🛠️ Stack technique

| Couche | Technologies |
|---|---|
| **Mobile** | React Native · Expo · Expo Router · Zustand · Axios · Expo SecureStore |
| **Backend** | Node.js · Express · TypeScript · architecture MVC/Clean |
| **Base de données** | PostgreSQL 16 · extension **pgvector** · ORM Sequelize |
| **IA** | API LLM (Claude / OpenAI) · embeddings 1536 dim. · function calling · streaming SSE |
| **Interopérabilité** | **MCP** (Model Context Protocol) · n8n *(bonus)* |
| **Sécurité** | JWT · bcrypt · Zod · Helmet · express-rate-limit |
| **Documentation** | Swagger / OpenAPI · Postman |
| **DevOps** | Docker multi-stage · docker-compose · Railway / Render |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    A[📱 Expo<br/>Zustand · SecureStore] -->|REST + SSE| B[⚙️ Express API]
    B --> C[🧠 Orchestrateur Agent<br/>prompt · RAG · outils · garde-fous]
    B --> D[(🗄️ PostgreSQL<br/>+ pgvector)]
    C --> D
    C -->|API| E[🤖 LLM]
    C -->|MCP| F[🔌 Serveur d'outils]
```

### Structure du projet

```
shopmate/
├── backend/
│   ├── src/
│   │   ├── config/                    # environnement, base de données, logger
│   │   ├── models/                    # Store, Product, Order, User, etc.
│   │   ├── app.ts                    # initialisation Express
│   │   ├── server.ts                 # démarrage du serveur
│   │   └── ...
│   ├── docker-compose.yml
│   ├── package.json
│   └── .env.example
├── mobile/                            # Expo Router, stores Zustand, écran chat SSE
├── docs/                              # cahier des charges, UML, journal de prompts
├── class-diagram.md                   # diagramme de classes
├── AGENTS.md                          # règles d'assistance IA
└── README.md
```

---

## 🗄️ Modèle de données

```mermaid
erDiagram
    Store ||--o{ User : "possède"
    Store ||--o{ Product : ""
    Store ||--o{ Customer : ""
    Store ||--o{ Order : ""
    Store ||--o{ Conversation : ""
    Store ||--o{ Document : ""
    User ||--o{ RefreshToken : ""
    Category ||--o{ Product : ""
    Customer ||--o{ Order : ""
    Order ||--o{ OrderItem : ""
    Product ||--o{ OrderItem : ""
    Conversation ||--o{ Message : ""
    Document ||--o{ Chunk : ""
```

| Entité | Rôle |
|---|---|
| `Store` | La boutique — **racine du tenant** |
| `User` / `RefreshToken` | Gérant/admin et jetons de session |
| `Category` / `Product` | Le catalogue (nom, description, prix, stock) |
| `Customer` | Le client acheteur (nom, téléphone, adresse) |
| `Order` / `OrderItem` | Les commandes et leurs lignes |
| `Conversation` / `Message` | L'historique du chat *(entités IA)* |
| `Document` / `Chunk` | Documents et morceaux vectorisés — `embedding vector(1536)` |
| `AgentLog` | Journal d'audit des interactions |

> Les 3 relations exigées sont présentes : **1—1** (User propriétaire), **1—N** (partout), **N—N** (Customer ↔ Product via `OrderItem`).

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js ≥ 20
- Docker et Docker Compose
- Une clé API LLM (Anthropic ou OpenAI)
- Expo Go sur ton téléphone (ou un émulateur)

### 1. Cloner le dépôt

```bash
git clone https://github.com/<ton-user>/shopmate-ai.git
cd shopmate-ai
```

### 2. Lancer la base de données

```bash
cd backend
cp .env.example .env      # puis remplis tes clés
docker compose up -d db
```

### 3. Installer et préparer le backend

```bash
npm install
npx sequelize-cli db:migrate      # crée les tables
npm run dev                       # → http://localhost:4000
```

> La structure actuelle du backend est basée sur Sequelize + PostgreSQL + pgvector, avec les modèles dans `backend/src/models` et le serveur démarré depuis `backend/src/server.ts`.

📖 Documentation API : `http://localhost:4000/api/docs`

### 4. Lancer l'application mobile

```bash
cd ../mobile
npm install
npx expo start
```

Scanne le QR code avec **Expo Go**.

> 💡 Sur un vrai téléphone, remplace `localhost` par l'IP locale de ta machine dans `EXPO_PUBLIC_API_URL` (ex. `http://192.168.1.10:4000`).

---

## 🔑 Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://user:pass@localhost:5432/shopmate` |
| `JWT_ACCESS_SECRET` | Secret du token d'accès | `une-chaîne-longue-et-aléatoire` |
| `JWT_REFRESH_SECRET` | Secret du refresh token | `une-autre-chaîne` |
| `ACCESS_TOKEN_TTL` | Durée de vie de l'access token | `15m` |
| `REFRESH_TOKEN_TTL` | Durée de vie du refresh token | `7d` |
| `LLM_API_KEY` | Clé du fournisseur LLM | `sk-...` |
| `LLM_MODEL` | Modèle de génération | `claude-sonnet-4-6` |
| `EMBEDDING_MODEL` | Modèle d'embeddings (1536 dim.) | `text-embedding-3-small` |
| `MCP_SERVER_URL` | URL du serveur d'outils MCP | `http://localhost:5001` |
| `PORT` | Port du backend | `4000` |

> ⚠️ Le fichier `.env` est dans `.gitignore`. **Ne commite jamais tes clés API.** Seul `.env.example` est versionné.

---

## 🌐 API REST

| Méthode | Route | Description | Accès |
|---|---|---|---|
| `POST` | `/api/auth/register` | Inscription | Public |
| `POST` | `/api/auth/login` | Connexion | Public |
| `POST` | `/api/auth/refresh` | Renouvellement du token | Public |
| `POST` | `/api/auth/logout` | Déconnexion | 🔒 |
| `GET` | `/api/products` | Liste, recherche, filtres | 🔒 |
| `GET` | `/api/products/:id` | Détail d'un produit | 🔒 |
| `POST` | `/api/products` | Créer un produit | 👑 Admin |
| `GET` | `/api/orders` | Commandes du client | 🔒 |
| `POST` | `/api/orders` | Créer une commande | 🔒 |
| `POST` | `/api/orders/:id/cancel` | Annuler une commande | 🔒 |
| `POST` | `/api/documents` | Déposer un document RAG | 👑 Admin |
| `POST` | `/api/agent/chat` | **Parler à l'agent (SSE)** | 🔒 |
| `GET` | `/api/agent/conversations` | Historique | 🔒 |
| `GET` | `/api/agent/logs` | Journal d'audit | 👑 Admin |

---

## 💬 Exemple de conversation

```
👤 Client    : Avez-vous cette chaussure en rouge ?
🤖 ShopMate  : [searchProducts] Oui — disponible en rouge, tailles 40 à 44, 249 DH.

👤 Client    : Taille 42, vous livrez à Casablanca ?
🤖 ShopMate  : [checkStock] La taille 42 est en stock.
               [RAG] Livraison gratuite à Casablanca sous 48h, paiement à la livraison.
               (source : politique-livraison.md)

👤 Client    : Je la veux.
🤖 ShopMate  : Je récapitule : chaussure rouge, taille 42, 249 DH,
               livraison Casablanca, paiement à la livraison.
               Je valide la commande ?                    ⟵ aucune écriture en base

👤 Client    : Oui.
🤖 ShopMate  : [createOrder] Commande n° 1234 enregistrée.
               Nous vous appellerons pour confirmation.

👤 Client    : Fais-moi une remise de 50 DH.
🤖 ShopMate  : Je ne peux pas modifier les prix — c'est en dehors de mon rôle.
               Je peux transmettre votre demande au gérant. ⟵ garde-fou
```

---

## 🔒 Sécurité

- ✅ JWT complet : inscription, connexion, **refresh avec rotation**, déconnexion invalidante
- ✅ Mots de passe hachés **bcrypt** — jamais de mot de passe ni de token dans les logs
- ✅ Rôles `ADMIN` / `CUSTOMER` + isolation stricte par `storeId` sur chaque requête
- ✅ Injections SQL bloquées par les requêtes paramétrées de l'ORM
- ✅ Validation **Zod** de toutes les entrées et de tous les arguments d'outils
- ✅ Helmet, CORS restrictif, rate limiting (20 messages agent / min / utilisateur)
- ✅ Secrets par variables d'environnement — jamais commités
- ✅ Journal d'audit : question, outils appelés, sources, latence, tokens

---

## 🐳 Déploiement

```bash
# Tout lancer en local (API + base)
docker compose up --build

# Build de l'image de production seule
docker build -t shopmate-api ./backend
```

Le `Dockerfile` est **multi-stage** (build puis runtime léger). Le `docker-compose.yml` démarre l'image `pgvector/pgvector` et l'API. L'hébergement cible est **Railway** ou **Render**, avec les secrets configurés côté plateforme.

---

## 🗺️ Feuille de route

| Semaine | Contenu | Statut |
|:---:|---|:---:|
| 1 | Cadrage, cahier des charges, UML/ERD, maquettes | 🟢 |
| 2 | PostgreSQL + Sequelize, migrations, seed, pgvector | ⚪ |
| 3 | Authentification JWT complète | ⚪ |
| 4 | CRUD produits/commandes, Swagger + Postman | ⚪ |
| 5 | Pipeline RAG (chunking, embeddings, recherche) | ⚪ |
| 6 | Function calling (outils + confirmation) | ⚪ |
| 7 | Streaming SSE + écran chat Expo | ⚪ |
| 8 | Garde-fous, modération, audit | ⚪ |
| 9 | Serveur MCP + n8n *(bonus)* | ⚪ |
| 10 | Docker + déploiement | ⚪ |
| 11 | Journal de prompts, documentation, soutenance | ⚪ |

🟢 fait · 🟡 en cours · ⚪ à faire

---

## 📚 Documentation du projet

| Document | Contenu |
|---|---|
| `docs/cahier-des-charges.pdf` | Périmètre, 38 besoins fonctionnels, 18 non fonctionnels, critères d'acceptation |
| `docs/conception-uml.md` | Cas d'utilisation, diagramme de classes, séquence, ERD |
| `docs/journal-de-prompts.md` | Vibe coding documenté — livrable évalué |
| `http://localhost:4000/api/docs` | Documentation Swagger interactive |

---

## 👤 Auteur

**Omar Fahid**
Projet Fil Rouge — *Mobile Augmented AI* · 2026

---

## 📄 Licence

Distribué sous licence **MIT**. Voir le fichier `LICENSE`.

---

<p align="center">
  <sub>Construit avec ☕ et beaucoup de prompts documentés.</sub>
</p>
