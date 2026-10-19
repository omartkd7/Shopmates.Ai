# Vérification depuis un clone propre

Cette checklist évite de confondre une installation déjà configurée avec une installation reproductible.

## Procédure

1. Cloner le dépôt dans un nouveau dossier.
2. Copier `backend/.env.example` vers `backend/.env` et définir des valeurs locales non secrètes pour la base et une valeur d'au moins 12 caractères pour `SEED_ADMIN_PASSWORD`.
3. Pour tester le chat réel, ajouter les clés LLM et embedding uniquement dans `backend/.env`.
4. Copier `mobile/.env.example` vers `mobile/.env`.
5. Démarrer les services depuis la racine :

```bash
docker compose up --build
```

6. Vérifier `http://localhost:4000/health` et `http://localhost:4000/api/docs`.
7. Dans un autre terminal, vérifier les tests :

```bash
cd backend
npm test
```

8. Démarrer le serveur MCP si le scénario de suivi de commande est présenté :

```bash
cd backend
npm run mcp
```

9. Démarrer le mobile :

```bash
cd mobile
npm install
npx expo start --lan
```

10. Cocher la procédure seulement après avoir exécuté chaque étape sur une machine ou un dossier propre.

## Résultat à consigner

| Vérification | Date | Résultat | Note |
|---|---|---|---|
| API et PostgreSQL démarrent | | | |
| Migrations, index pgvector et seed | | | |
| Swagger accessible | | | |
| `npm test` passe | | | |
| Mobile se connecte à l'API | | | |
