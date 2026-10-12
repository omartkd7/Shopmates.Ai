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
- [Associations et isolation multi-tenant](#associations-et-isolation-multi-tenant)
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
  Store ||--|| User : "a pour propriétaire"
  Store ||--o{ RefreshToken : "possède"
  Store ||--o{ Category : "possède"
    Store ||--o{ Product : ""
    Store ||--o{ Customer : ""
    Store ||--o{ Order : ""
  Store ||--o{ OrderItem : "possède"
    Store ||--o{ Conversation : ""
  Store ||--o{ Message : "possède"
    Store ||--o{ Document : ""
  Store ||--o{ Chunk : "possède"
  Store ||--o{ AgentLog : ""
    User ||--o{ RefreshToken : ""
  User ||--o{ Conversation : ""
  User ||--o{ Document : "téléverse"
  Category ||--o{ Product : "contient"
  Customer ||--o{ Order : "passe"
  Customer ||--o{ OrderItem : "achète"
  Order ||--o{ OrderItem : "contient"
  Product ||--o{ OrderItem : "figure dans"
  Conversation ||--o{ Message : "contient"
  Document ||--o{ Chunk : "contient"
```

Source Mermaid modifiable : [docs/model-relations.mmd](docs/model-relations.mmd).

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

> La relation **1—1** relie une boutique à son propriétaire. Les relations **1—N** relient les boutiques et leurs données métier. La relation **N—N** entre `Customer` et `Product` passe par `OrderItem`, qui conserve aussi la commande et le client concernés.

### Associations et isolation multi-tenant

Les associations sont enregistrées dans `backend/src/models/index.ts` :

- **Propriétaire** : `Store.hasOne(User)` et `User.belongsTo(Store)`. Un index unique sur `users.storeId` empêche d'avoir deux propriétaires pour la même boutique.
- **Relations 1—N** : par exemple, une boutique possède plusieurs produits, catégories et commandes; une commande possède plusieurs lignes `OrderItem`.
- **Relation N—N** : `Customer.belongsToMany(Product)` et l'association inverse utilisent `OrderItem` comme table de jonction. `OrderItem.customerId` est rempli par une migration depuis le client de la commande existante.

Chaque modèle métier a un `storeId`. Pour filtrer les requêtes, le helper `forStore` est exporté par `backend/src/models/index.ts` :

```ts
const scopedCustomers = forStore(Customer, authenticatedStoreId);
const customers = await scopedCustomers.findAll();
```

`authenticatedStoreId` doit venir de l'utilisateur authentifié côté serveur, généralement depuis le JWT. Ne le prends jamais depuis le corps ou les paramètres envoyés par le client. Utilise `forStore` pour chaque requête sur un modèle tenant; le helper rejette un identifiant invalide, mais une requête non passée par ce helper n'est pas filtrée automatiquement.

`Chunk.embedding` utilise le type Sequelize `DataTypes.VECTOR(1536)` fourni par `pgvector/sequelize`. La migration crée l'extension et la colonne vectorielle. Le fichier `backend/sql/001_init_pgvector.sql` ajoute l'index HNSW pour la recherche cosinus; applique-le après les migrations si tu veux activer cet index.

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js ≥ 22 (requis par la version installée de `pgvector`)
- Docker et Docker Compose
- PowerShell, Bash ou un terminal équivalent

### 1. Cloner le dépôt

```bash
git clone https://github.com/<ton-user>/shopmate-ai.git
cd shopmate-ai
```

### 2. Configurer le backend

```bash
cd backend
npm install
```

Copie `backend/.env.example` vers `backend/.env`, puis ajoute les variables locales suivantes. Le fichier `.env.example` est actuellement vide.

```powershell
Copy-Item .env.example .env
```

Dans Git Bash ou macOS/Linux, l'équivalent est `cp .env.example .env`.

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopmate
DB_USER=postgres
DB_PASSWORD=password
PORT=4000
SEED_ADMIN_PASSWORD=
```

Choisis une valeur d'au moins 12 caractères pour `SEED_ADMIN_PASSWORD`. Ces paramètres correspondent au `docker-compose.yml` du backend et sont réservés au développement local. Ne réutilise pas ce mot de passe en production.

### 3. Lancer PostgreSQL et les migrations

Depuis le dossier `backend` :

```bash
docker compose up -d db
docker compose ps
npx --no-install sequelize-cli db:migrate --config src/config/sequelize-cli.js --migrations-path migrations --env development
npx --no-install sequelize-cli db:migrate:status --config src/config/sequelize-cli.js --migrations-path migrations --env development
```

La première commande démarre PostgreSQL avec pgvector. La commande `db:migrate` crée ou met à jour le schéma; la commande `db:migrate:status` doit ensuite afficher chaque migration comme `up`. Les migrations sont la seule méthode prévue pour gérer le schéma : l'application n'utilise pas `sequelize.sync()`.

Pour créer l'index HNSW après les migrations, depuis `backend` :

PowerShell :

```powershell
Get-Content .\sql\001_init_pgvector.sql | docker compose exec -T db psql -U postgres -d shopmate
```

Bash, macOS ou Linux :

```bash
docker compose exec -T db psql -U postgres -d shopmate < sql/001_init_pgvector.sql
```

### 4. Créer les données de démonstration

Après les migrations, et après avoir défini `SEED_ADMIN_PASSWORD` dans `.env` :

```bash
npm run seed
```

Le seed peut être relancé sans dupliquer les enregistrements. Il crée la boutique `ShopMate Demo Store`, l'admin `admin@shopmate-demo.local` avec un mot de passe hashé par bcrypt, 4 catégories, 15 produits avec prix et stock, et 4 documents d'exemple avec leurs chunks texte. Le mot de passe n'est jamais affiché dans la console.

Les documents sont créés au statut `pending` et leurs chunks ont `embedding = null` : le seed fournit le contenu de démonstration, mais ne génère pas d'embeddings. La recherche vectorielle ne trouvera pas ces documents avant l'exécution du pipeline d'embedding.

### 5. Démarrer et vérifier l'API

```bash
npm run dev
```

Le serveur s'authentifie auprès de PostgreSQL avant d'écouter sur le port `PORT`. Vérifie l'API avec `http://localhost:4000/health`, puis récupère le catalogue de démonstration avec `http://localhost:4000/api/products`. Cette route publique ne lit que la boutique fixe `ShopMate Demo Store`; elle n'accepte pas de `storeId` fourni par le client. La documentation `/api/docs` n'est pas encore configurée.

Vérifications supplémentaires, toujours depuis `backend` :

```bash
npx --no-install tsc --noEmit
npx --no-install sequelize-cli db:migrate:status --config src/config/sequelize-cli.js --migrations-path migrations --env development
```

Pour tester une association, charge les modèles depuis `src/models`, puis fais une requête de lecture avec `include`, par exemple `forStore(Customer, storeId).findAll({ include: [{ association: Customer.associations.purchasedProducts }] })`. Tu peux aussi tester `Store.associations.owner`. N'exécute ces vérifications que sur une base locale/de test.

Pour arrêter PostgreSQL sans supprimer ses données : `docker compose stop db`. N'utilise pas `docker compose down -v` sauf si tu veux aussi supprimer le volume de données local.

### 6. Démarrer l'application mobile

Dans un nouveau terminal, depuis la racine du dépôt :

```powershell
Set-Location mobile
Copy-Item .env.example .env
npm install
npx expo start --lan
```

Scanne le QR code avec **Expo Go**. Dans `mobile/.env`, `EXPO_PUBLIC_API_URL` vaut `http://localhost:4000` par défaut. Sur un téléphone physique, remplace `localhost` par l'adresse IPv4 locale de ton ordinateur, par exemple `http://192.168.1.10:4000`; le téléphone et l'ordinateur doivent être sur le même réseau. `localhost` convient à un émulateur qui partage le réseau de développement, pas à un téléphone physique.

Le thème mobile contient des tokens provisoires car le dépôt ne contient pas de maquette Figma mobile. Remplace ces valeurs par celles des maquettes lorsqu'elles seront disponibles.

---

## 🔑 Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `shopmate` |
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL local | `password` |
| `PORT` | Port du backend | `4000` |
| `SEED_ADMIN_PASSWORD` | Mot de passe choisi pour le compte admin seedé (12 caractères minimum) | À définir localement |

> Le backend lit actuellement les paramètres PostgreSQL, `PORT` et `SEED_ADMIN_PASSWORD`. Les paramètres JWT, LLM et MCP seront documentés avec les modules qui les utiliseront. Le fichier `.env` est dans `.gitignore`; ne commite jamais de vrais secrets. Les valeurs de connexion ci-dessus ne sont que pour le conteneur local.

---

## 🌐 API REST

| Méthode | Route | Description | Accès |
|---|---|---|---|
| `GET` | `/health` | État du serveur | Public |
| `POST` | `/api/auth/register` | Inscription | Public |
| `POST` | `/api/auth/login` | Connexion | Public |
| `POST` | `/api/auth/refresh` | Renouvellement du token | Public |
| `POST` | `/api/auth/logout` | Déconnexion | 🔒 |
| `GET` | `/api/products` | Catalogue du `ShopMate Demo Store` seedé | Public (démo) |
| `GET` | `/api/products/:id` | Détail d'un produit | 🔒 |
| `POST` | `/api/products` | Créer un produit | 👑 Admin |
| `GET` | `/api/orders` | Commandes du client | 🔒 |
| `POST` | `/api/orders` | Créer une commande | 🔒 |
| `POST` | `/api/orders/:id/cancel` | Annuler une commande | 🔒 |

> Dans cette étape, seules `GET /health` et `GET /api/products` sont implémentées. Les autres routes du tableau décrivent l'API cible et seront ajoutées dans les tâches correspondantes.
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
