# 📓 Journal de Prompts — ShopMate AI

> **Projet :** ShopMate AI — E-commerce COD & Assistant IA (Fil Rouge 2026)  
> **Auteur :** Omar Fahid  
> **Livrable évalué :** Documentation du développement assisté par IA (Vibe Coding raisonné)  
> **Date limite :** 24 Octobre 2026  

---

## 🎯 Objectif du document

Ce journal documente les échanges avec l'assistant de programmation IA, les choix d'architecture, les problèmes rencontrés et les apprentissages clés pour préparer la soutenance.

---

## 📑 Structure d'une entrée de journal

Chaque session de travail importante doit contenir :
1. **Date & Tâche Jira** (ex: `SA-1`, `SA-2`, etc.)
2. **Objectif** : Ce qu'on voulait réaliser
3. **Prompts clés** : Ce qui a été demandé à l'IA
4. **Décisions & Architecture** : Ce qui a été décidé et pourquoi
5. **Problèmes résolus** : Bugs trouvés et comment ils ont été corrigés
6. **Ce que j'ai appris pour la soutenance** : Explication avec mes propres mots

---

## 🗓️ Sessions de développement

### Session 1 — Initialisation & Diagnostic du Projet (12 Octobre 2026)
- **Tâches associées :** `SA-1` à `SA-5` (Configuration initiale, base de données, modèles Sequelize, seed et application mobile).
- **Objectif :** Vérifier l'intégrité du projet, analyser les fichiers de configuration, la base de données et préparer le terrain pour l'authentification.
- **Problèmes identifiés et corrigés :**
  1. **Git & `.gitignore` :** Le `.gitignore` racine ne filtrait pas `node_modules/`, entraînant le tracking accidentel de dépendances. Le fichier a été complété et les fichiers inutiles ont été dé-indexés de Git.
  2. **Variables d'environnement :** Ajout de `SEED_ADMIN_PASSWORD` dans `backend/.env` pour permettre l'exécution réussie du script `npm run seed`.
  3. **Port serveur :** Sécurisation du port dans `backend/src/server.ts` avec une valeur par défaut (`4000`) si la variable d'environnement n'est pas renseignée.
- **Décisions d'architecture :**
  - **ORM :** Utilisation confirmée de **Sequelize** (avec PostgreSQL et `pgvector`) plutôt que Prisma.
  - **Isolation Multi-tenant :** Chaque modèle possède un champ `storeId` injecté côté serveur via le helper `forStore()`.
  - **Séparation RAG vs Tools :** RAG pour les connaissances statiques de la boutique ; Function Calling pour les actions en direct (prix, stock, commande).
- **Points clés pour la soutenance :**
  - Pourquoi `storeId` ne doit jamais venir du client : Pour éviter qu'un utilisateur ou une boutique accède aux données d'un autre tenant (fuite de données / IDOR).
  - Pourquoi le stock et les prix ne sont jamais générés directement par le LLM : Pour éviter les hallucinations ; ils sont toujours interrogés en temps réel depuis la base de données.
