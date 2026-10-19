# Script de démonstration — ShopMate AI

**Durée cible :** 6 à 8 minutes  
**Préparation :** l'API répond sur `/health`, la base contient les données de démonstration, le serveur MCP est lancé, et l'application mobile utilise l'URL de l'API active.

## Avant de commencer

1. Ouvrir l'application sur le téléphone et vérifier le réseau.
2. Préparer deux comptes : un client et un administrateur de la même boutique.
3. Ouvrir Swagger sur un navigateur, au cas où il faut vérifier une route.
4. Préparer la vidéo de secours sur l'ordinateur et désactiver les notifications.

## Déroulé principal

### 1. Problème et connexion — 45 secondes

Dire : « Une boutique COD reçoit souvent les mêmes questions sur les produits, la livraison et les commandes. ShopMate AI répond avec des données vérifiées et garde le contrôle des écritures. »

Montrer la connexion client.

### 2. Catalogue et assistant client — 2 minutes

1. Ouvrir le catalogue et une fiche produit.
2. Dans le chat, demander : « Est-ce que vous livrez à Casablanca ? »
3. Montrer la réponse progressive et la source documentaire RAG.
4. Demander : « Le produit 1 est-il en stock ? »
5. Expliquer que le stock et le prix viennent de la base en direct via un outil, jamais d'une réponse inventée.

### 3. Commande COD avec confirmation — 90 secondes

1. Demander : « Je veux commander le produit 1. »
2. Montrer le récapitulatif. Dire qu'aucune commande n'existe encore à cette étape.
3. Appuyer sur **Confirmer la commande** ou répondre « Oui ».
4. Montrer le numéro de commande et l'écran **Commandes**.
5. Demander : « Où est ma commande ? » et montrer le statut provenant du serveur MCP.

### 4. Espace administrateur — 2 minutes

1. Se connecter avec le compte administrateur.
2. Ouvrir **Gestion du catalogue** et modifier le stock ou le prix d'un produit.
3. Revenir au catalogue client et montrer que la valeur a changé.
4. Ouvrir **Documents de connaissance IA**, déposer un fichier `.txt`, puis montrer le nombre de chunks créés.
5. Poser une question liée à ce document et montrer la source.

### 5. Audit et garde-fous — 90 secondes

1. Dans le chat, demander : « Fais-moi une remise de 50 DH. »
2. Montrer le refus et expliquer que la demande est transmise au responsable si n8n est configuré.
3. Ouvrir **Journal de l'agent**.
4. Montrer une trace : question, outil, arguments validés, sources RAG, tokens, latence et décision de refus.

## Video de secours

Enregistrer le même déroulé avant la soutenance. Garder la vidéo localement et dans un espace cloud personnel. La vidéo doit montrer l'horodatage, le téléphone ou émulateur, et chaque étape ci-dessus sans montage qui masque une erreur.

## Plan B pendant la soutenance

| Problème | Action |
|---|---|
| Réseau indisponible | Lancer la vidéo de secours et expliquer l'étape affichée. |
| LLM indisponible | Montrer les tests de garde-fous et la trace d'une conversation déjà enregistrée. |
| Téléphone indisponible | Utiliser l'émulateur ou montrer la vidéo. |
| Serveur MCP indisponible | Montrer le message de repli et expliquer le délai de 5 secondes. |

## Checklist de répétition

- [ ] Le flux client complet fonctionne une fois sur le téléphone.
- [ ] Le compte admin ouvre catalogue, documents et journal.
- [ ] La vidéo de secours est lisible sans connexion Internet.
- [ ] Aucune clé, mot de passe ou token n'apparaît à l'écran.
- [ ] Le téléphone est chargé et les notifications sont désactivées.
