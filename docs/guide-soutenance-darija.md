# Guide soutenance — ShopMate AI

> **But :** comprendre le projet, pas réciter du code. À chaque réponse, commence par l'idée métier, puis explique la protection technique.

## 1. Le projet en 30 secondes

**Réponse à dire :**

« ShopMate AI est une application mobile e-commerce pour une boutique marocaine qui travaille en paiement à la livraison, COD. Le client peut parcourir le catalogue, discuter avec un assistant IA, passer une commande après confirmation, et suivre la livraison. Le gérant gère les produits, les documents utilisés par l’IA et les traces de chaque conversation. »

Le besoin principal est de répondre vite aux questions répétitives sans laisser une IA inventer le stock, les prix ou créer une commande sans accord clair.

## 2. Les technologies

| Partie | Technologie | Pourquoi |
|---|---|---|
| Mobile | React Native + Expo Router + TypeScript | Une application Android/iOS avec navigation par écrans |
| État mobile | Zustand | Garder la session, le catalogue et les filtres côté app |
| API | Node.js + Express + TypeScript | Exposer les routes et appliquer les règles de sécurité |
| Base de données | PostgreSQL 16 | Stocker utilisateurs, produits, commandes et conversations |
| ORM | **Sequelize** | Modèles TypeScript et migrations SQL |
| Recherche IA | pgvector + OpenAI embeddings | Chercher des morceaux de documents selon le sens |
| Chat IA | API compatible OpenAI | Générer la réponse et demander des outils contrôlés |
| Suivi livraison | MCP | Séparer l’outil de suivi transporteur du backend |
| Conteneurs | Docker + docker-compose | Lancer API et PostgreSQL de façon reproductible |

**Point important :** le vrai ORM dans le code est Sequelize. Si le jury parle de Prisma, explique que le projet final utilise Sequelize et les migrations dans `backend/migrations`.

## 3. Architecture complète

```text
Téléphone Expo
     |
     | HTTPS / REST + SSE
     v
Express API
  |       |          |
  |       |          +--> MCP server: statut livraison mocké
  |       |
  |       +--> LLM: texte + demandes d’outils
  |
  +--> PostgreSQL + pgvector
        utilisateurs, produits, commandes, documents, chunks, logs
```

Le téléphone ne décide jamais le `storeId`, le prix, le stock ou les droits. Le serveur reçoit le JWT, récupère l’identité et applique les règles.

## 4. Authentification et session

Fichiers importants :

- `backend/src/routes/auth.ts`
- `backend/src/config/jwt.ts`
- `mobile/src/auth/tokenStorage.ts`
- `mobile/src/api/client.ts`

### Flux login

1. Le client envoie email et mot de passe vers `POST /api/auth/login`.
2. Le backend valide les données avec Zod.
3. bcrypt compare le mot de passe avec le hash enregistré.
4. Le backend retourne un access token JWT et un refresh token.
5. Le mobile les stocke dans Expo SecureStore, jamais dans AsyncStorage normal.
6. Axios envoie l’access token dans `Authorization: Bearer ...`.

### Pourquoi deux tokens ?

- **Access token :** court, utilisé pour les routes protégées.
- **Refresh token :** permet d’obtenir une nouvelle session sans reconnecter le client.
- **Rotation :** à chaque refresh, l’ancien refresh token est supprimé et un nouveau est créé. Un token volé et déjà utilisé est rejeté.

### Réponse jury

« Je garde un access token court pour limiter le risque. Le refresh token est hashé dans la base, il expire après sept jours et il est remplacé à chaque utilisation. La déconnexion supprime son enregistrement. »

## 5. Multi-tenant : la règle la plus importante

Chaque ligne métier contient un `storeId`: produits, commandes, documents, chunks, messages et logs.

Le JWT contient `userId`, `storeId`, rôle et email. Le middleware `injectTenant` lit le JWT et pose `req.storeId`. Le client ne peut pas choisir son `storeId` dans le body ou dans la query.

`forStore(Model, storeId)` ajoute un filtre Sequelize automatique. Donc une boutique A ne peut pas demander les produits ou documents de la boutique B.

**Réponse courte :**

« Le `storeId` vient seulement du JWT vérifié côté serveur. Chaque requête DB est filtrée avec ce storeId. Même si un client envoie un autre storeId, le backend l’ignore ou le supprime. »

## 6. Catalogue et commandes COD

### Catalogue

- Client : lire et chercher les produits.
- Admin : créer, modifier et supprimer produits et catégories, y compris prix et stock.
- Les prix et stocks viennent toujours de PostgreSQL en direct.

### Commande

1. Le client demande une commande.
2. L’agent prépare un **récapitulatif** sans écrire dans la base.
3. Le client répond explicitement « Oui », « wakha », « je confirme », etc.
4. Le backend ouvre une transaction Sequelize.
5. Il verrouille la ligne produit avec `LOCK.UPDATE`, vérifie le stock actuel, crée la commande et diminue le stock.
6. La transaction est validée ou annulée entièrement en cas d’erreur.

Pourquoi une transaction ? Sans transaction, deux clients peuvent acheter le dernier produit au même moment. Le verrou protège le stock.

Pourquoi confirmation ? L’IA ne peut pas créer une commande sur une phrase vague comme « je la veux ».

## 7. RAG : documents de connaissance

**RAG = Retrieval Augmented Generation.** Cela permet à l’IA de répondre avec les documents de la boutique: livraison, retours, FAQ, guide des tailles.

Fichiers : `backend/src/routes/documents.ts` et `backend/src/services/rag.ts`.

### Ingestion d’un document

1. L’admin envoie un fichier `.txt` ou `.md`.
2. Le backend le découpe en morceaux d’environ 800 caractères avec 100 caractères de chevauchement.
3. Chaque morceau reçoit un embedding OpenAI `text-embedding-3-small` de 1536 dimensions.
4. Les morceaux et leurs vecteurs vont dans la table `chunks` de PostgreSQL/pgvector.
5. L’index HNSW accélère la recherche par distance cosinus.

### Quand un client pose une question

1. La question reçoit aussi un embedding.
2. PostgreSQL cherche les 6 chunks les plus proches, filtrés avec le `storeId`.
3. Si le score est inférieur à `0.75`, aucun contexte n’est donné.
4. L’agent répond alors exactement : **« Je n'ai pas cette information. »**
5. Sinon le LLM reçoit les chunks et cite la source.

**RAG ne donne pas le stock ou le prix**, parce qu’un document devient vite ancien.

## 8. Function calling : données en direct et actions

Fichier : `backend/src/services/agentTools.ts`.

Il y a exactement 8 outils autorisés :

1. `searchProducts`
2. `getProductDetails`
3. `checkStock`
4. `createOrder`
5. `getOrderStatus`
6. `listMyOrders`
7. `cancelOrder`
8. `getShipmentStatus`

Le LLM peut demander un outil mais il ne l’exécute jamais directement. Le backend vérifie :

- le nom est dans l’allowlist;
- les arguments passent Zod;
- le `storeId` et le `userId` sont injectés depuis le JWT;
- au maximum 3 appels par tour;
- les écritures ont besoin de confirmation.

**Phrase à mémoriser :**

« RAG répond à une connaissance stable avec une source. Function calling lit une donnée live ou exécute une action contrôlée. »

## 9. Chat streaming SSE

Route : `POST /api/agent/chat`.

SSE signifie Server-Sent Events. Le serveur garde la connexion ouverte et envoie la réponse petit à petit, token par token. C’est pourquoi l’utilisateur voit le texte apparaître progressivement.

Événements principaux : `start`, `source`, `tool_call`, `tool_result`, `token`, `confirmation`, `done`, `error`.

Le mobile utilise `XMLHttpRequest` pour lire le flux. Si le client ferme l’écran, un `AbortController` interrompt l’appel LLM pour ne pas gaspiller de tokens.

## 10. Guardrails et sécurité IA

Fichier : `backend/src/services/guardrails.ts`.

Avant le LLM :

- détection de prompt injection;
- refus des remises, changements de prix et remboursements;
- refus des données d’un autre client;
- refus des conseils médicaux/juridiques et du hors sujet.

Pendant le LLM :

- prompt système : documents et résultats d’outils sont des données, jamais des instructions;
- connaissance seulement à partir du RAG;
- stock/prix seulement avec outils.

Après le LLM :

- modération de sortie : bloque fuite de prompt, clé API ou remise inventée.

Exemple : « Fais-moi une remise de 50 DH » est refusé poliment et peut être transmis au gérant via n8n.

## 11. Limites de coût et audit

- Maximum 20 messages agent par minute et par utilisateur : HTTP 429 au 21e message.
- Maximum 1024 tokens dans une réponse.
- Maximum 3 appels outils par tour.
- `AgentLog` garde question, réponse, outils validés, sources RAG, tokens, latence et refus.
- Les mots de passe, tokens et secrets sont masqués avant écriture dans les logs.

Le gérant consulte ces logs avec `GET /api/agent/logs`, filtrés par boutique et réservés au rôle ADMIN.

## 12. MCP et n8n

### MCP

MCP veut dire Model Context Protocol. Dans ce projet, `shipmentServer.ts` expose `getShipmentStatus` avec des données mockées. Le backend est client MCP et demande le statut de la commande du client connecté. Si le serveur MCP ne répond pas dans 5 secondes, l’app montre un message simple de repli.

### n8n bonus

Après une commande ou une demande de remise/remboursement, le backend peut appeler un webhook n8n. n8n envoie ensuite une notification au gérant. C’est *best effort* : une panne n8n ne doit jamais casser une commande.

## 13. Docker et démarrage

`docker-compose.yml` lance :

- `db`: image `pgvector/pgvector:pg16`;
- `api`: Dockerfile multi-stage Node 22.

Le conteneur API : attend la DB saine, lance les migrations Sequelize, applique le SQL pgvector, lance le seed si `SEED_ADMIN_PASSWORD` existe, puis démarre Express avec l’utilisateur non-root `shopmate`.

## 14. Tests à citer

Dans `backend`, la commande `npm test` vérifie :

- auth, rotation refresh et logout;
- isolation de boutiques et clients;
- les 8 outils, Zod et allowlist;
- confirmation, transaction et idempotence de commande;
- 21 règles de guardrails;
- limites de coût et 429;
- service n8n.

Ne dis pas « tout est parfait ». Dis : « Les tests automatisés passent localement. Il reste à prouver Docker, le téléphone réel et le déploiement public avec la checklist. »

## 15. Questions probables du jury

### Pourquoi RAG et outils sont séparés ?
Parce que les politiques de livraison viennent de documents, alors que le stock et le prix changent. RAG répond avec les documents; les outils interrogent la base live.

### Comment empêches-tu une commande accidentelle ?
`createOrder` retourne d’abord un récapitulatif. La vraie écriture ne commence qu’après confirmation explicite, dans une transaction avec verrou de stock.

### Comment empêches-tu une fuite entre boutiques ?
Le serveur extrait `storeId` du JWT et applique ce filtre à chaque modèle et recherche RAG. Le client ne choisit jamais ce champ.

### C’est quoi un embedding ?
Une liste de 1536 nombres qui représente le sens d’un texte. Deux textes au sens proche ont des vecteurs proches.

### C’est quoi pgvector et HNSW ?
pgvector permet à PostgreSQL de stocker et comparer les embeddings. HNSW est un index spécialisé qui accélère la recherche des vecteurs proches.

### Comment gères-tu prompt injection ?
Je détecte les demandes suspectes, je refuse avant le LLM, le prompt rappelle que documents/outils sont des données, puis je modère la réponse finale.

### Pourquoi JWT + refresh rotation ?
Le JWT court protège les routes. Le refresh token permet de renouveler la session et la rotation annule l’ancien token pour réduire le risque de réutilisation.

## 16. Plan de révision avant le 22 octobre

1. Lis les sections 1 à 6 et explique-les sans regarder le texte.
2. Fais un dessin de l’architecture de la section 3.
3. Répète trois réponses : RAG vs outils, multi-tenant, confirmation/transaction.
4. Ouvre le mobile, puis montre une vraie question RAG, un stock, une commande et les logs.
5. Lance `cd backend && npm test` et explique chaque groupe de tests.
6. Utilise `docs/demo-script.md` pour la répétition complète.

## 17. Honnêteté pendant la soutenance

Le code montre que les parties backend et mobile existent. Par contre, avant de dire que le projet est totalement livré, vérifie réellement : Docker Desktop, clone propre, téléphone réel, build installable et URL publique. Si une partie n’est pas faite, explique ce qui est déjà prêt dans le code et ce qui reste à déployer. C’est mieux qu’inventer.
