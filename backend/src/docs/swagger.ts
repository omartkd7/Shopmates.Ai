import swaggerUi from "swagger-ui-express";
import { Router, Request, Response, NextFunction } from "express";

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "ShopMate AI — Backend REST API",
    version: "1.0.0",
    description:
      "Documentation interactive de l'API ShopMate AI (E-commerce COD, Assistant IA RAG, Multi-Tenant).\n\n" +
      "### Authentification\n" +
      "Les routes protégées nécessitent un Bearer Token JWT obtenu via `POST /api/auth/login` ou `POST /api/auth/register`.\n" +
      "Cliquez sur **Authorize** ci-dessous pour injecter votre jeton d'accès.",
    contact: {
      name: "Omar Fahid — ShopMate AI",
    },
  },
  servers: [
    ...(process.env.PUBLIC_API_URL
      ? [{ url: process.env.PUBLIC_API_URL.replace(/\/$/, ""), description: "Serveur de production" }]
      : []),
    {
      url: "http://localhost:4000",
      description: "Serveur de développement local",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Entrez votre JWT access token (obtenu via login ou register)",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Message d'erreur" },
          details: { type: "object", nullable: true },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          storeId: { type: "integer", example: 1 },
          name: { type: "string", example: "Omar Fahid" },
          email: { type: "string", example: "client@shopmate-demo.local" },
          role: { type: "string", enum: ["ADMIN", "CUSTOMER"], example: "CUSTOMER" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          storeId: { type: "integer", example: 1 },
          categoryId: { type: "integer", nullable: true, example: 1 },
          name: { type: "string", example: "Huile d'Argan Bio" },
          description: { type: "string", example: "Huile 100% pure et naturelle pressée à froid" },
          price: { type: "number", example: 149.0 },
          stock: { type: "integer", example: 25 },
          sku: { type: "string", example: "ARG-100ML" },
          category: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer", example: 1 },
              name: { type: "string", example: "Cosmétique" },
            },
          },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          storeId: { type: "integer", example: 1 },
          name: { type: "string", example: "Cosmétique & Soins" },
          description: { type: "string", example: "Produits de soins traditionnels et modernes" },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          orderId: { type: "integer", example: 10 },
          productId: { type: "integer", example: 2 },
          quantity: { type: "integer", example: 2 },
          unitPrice: { type: "number", example: 120.0 },
          product: { $ref: "#/components/schemas/Product" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "integer", example: 10 },
          storeId: { type: "integer", example: 1 },
          customerId: { type: "integer", example: 4 },
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
            example: "PENDING",
          },
          total: { type: "number", example: 240.0 },
          createdAt: { type: "string", format: "date-time" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/OrderItem" },
          },
        },
      },
      Document: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          storeId: { type: "integer", example: 1 },
          uploadedBy: { type: "integer", example: 1 },
          name: { type: "string", example: "Politique de retour & livraison.txt" },
          fileUrl: { type: "string", example: "uploads/politique_retour.txt" },
          mimeType: { type: "string", example: "text/plain" },
          status: {
            type: "string",
            enum: ["pending", "processing", "completed", "failed"],
            example: "completed",
          },
        },
      },
      Conversation: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          storeId: { type: "integer", example: 1 },
          userId: { type: "integer", example: 4 },
          title: { type: "string", example: "Disponibilité de l'huile d'argan" },
          status: { type: "string", example: "active" },
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                sender: { type: "string", enum: ["user", "assistant"], example: "user" },
                content: { type: "string", example: "Est-ce en stock ?" },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      AgentLog: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          storeId: { type: "integer", example: 1 },
          agentName: { type: "string", example: "ShopMate-Assistant" },
          action: { type: "string", example: "searchProducts" },
          status: { type: "string", enum: ["success", "error"], example: "success" },
          conversationId: { type: "integer", nullable: true },
          messageId: { type: "integer", nullable: true },
          input: { type: "string", example: "argan" },
          output: { type: "string", example: "3 produits trouvés" },
          toolsCalled: { type: "array", items: { type: "object" } },
          ragSources: { type: "array", items: { type: "object" } },
          tokenUsage: { type: "object", nullable: true },
          latencyMs: { type: "integer", nullable: true },
          refusalCategory: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  tags: [
    { name: "Health", description: "Vérification de l'état de l'API" },
    { name: "Auth", description: "Inscription, connexion, rotation JWT et profil" },
    { name: "Products", description: "Catalogue public et gestion admin des produits" },
    { name: "Categories", description: "Gestion des catégories du magasin" },
    { name: "Orders", description: "Passage et gestion des commandes en paiement à la livraison (COD)" },
    { name: "Documents", description: "Documents de connaissances pour le RAG (Admin)" },
    { name: "Agent", description: "Assistant conversationnel IA (SSE) et journalisation" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Vérification de l'état du serveur",
        responses: {
          200: {
            description: "Serveur opérationnel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "oki Server is healthy" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Inscription d'un nouvel utilisateur",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Omar Fahid" },
                  email: { type: "string", example: "client@shopmate-demo.local" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Utilisateur créé avec tokens d'accès",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Validation échouée", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "Email déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Connexion utilisateur",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "admin@shopmate-demo.local" },
                  password: { type: "string", example: "AdminSecurePassword123!" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Connexion réussie",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Identifiants invalides" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotation du jeton de rafraîchissement (TTL 7j)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string", example: "raw_refresh_token_string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Nouvelle paire de jetons émise",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Jeton de rafraîchissement expiré ou révoqué" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Déconnexion et révocation du jeton",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Déconnexion réussie" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Profil et identité de l'utilisateur connecté",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Détails de l'utilisateur",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        userId: { type: "integer", example: 1 },
                        storeId: { type: "integer", example: 1 },
                        role: { type: "string", example: "ADMIN" },
                        email: { type: "string", example: "admin@shopmate-demo.local" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Non authentifié" },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "Recherche et liste des produits paginés",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Recherche textuelle (nom, description)" },
          { name: "categoryId", in: "query", schema: { type: "integer" }, description: "Filtrer par catégorie" },
          { name: "minPrice", in: "query", schema: { type: "number" }, description: "Prix minimum" },
          { name: "maxPrice", in: "query", schema: { type: "number" }, description: "Prix maximum" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numéro de page" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Articles par page" },
        ],
        responses: {
          200: {
            description: "Liste paginée de produits",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    storeId: { type: "integer" },
                    products: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Créer un produit (Admin uniquement)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "price"],
                properties: {
                  name: { type: "string", example: "Nouveau Produit" },
                  description: { type: "string", example: "Description du produit" },
                  price: { type: "number", example: 199.99 },
                  stock: { type: "integer", example: 50 },
                  sku: { type: "string", example: "SKU-TEST-01" },
                  categoryId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Produit créé avec succès" },
          403: { description: "Réservé aux administrateurs" },
        },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Détail d'un produit",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Produit trouvé", content: { "application/json": { schema: { properties: { product: { $ref: "#/components/schemas/Product" } } } } } },
          404: { description: "Produit introuvable" },
        },
      },
      put: {
        tags: ["Products"],
        summary: "Modifier un produit (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  price: { type: "number" },
                  stock: { type: "integer" },
                  sku: { type: "string" },
                  categoryId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Produit mis à jour" },
          403: { description: "Accès refusé" },
          404: { description: "Produit introuvable" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Supprimer un produit (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Produit supprimé" },
          403: { description: "Accès refusé" },
          404: { description: "Produit introuvable" },
        },
      },
    },
    "/api/products/{id}/stock": {
      get: {
        tags: ["Products"],
        summary: "Stock et prix en direct (Vérification live DB)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: {
            description: "Informations d'inventaire en temps réel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Classic cotton T-shirt" },
                    price: { type: "number", example: 129.0 },
                    stock: { type: "integer", example: 24 },
                    inStock: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          404: { description: "Produit non trouvé" },
        },
      },
    },
    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "Liste de toutes les catégories du magasin",
        responses: {
          200: {
            description: "Liste des catégories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    categories: { type: "array", items: { $ref: "#/components/schemas/Category" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Créer une catégorie (Admin)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Nouvelle Catégorie" },
                  description: { type: "string", example: "Description optionnelle" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Catégorie créée" },
          409: { description: "Catégorie déjà existante" },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "Historique des commandes (Client courant)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Liste des commandes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    orders: { type: "array", items: { $ref: "#/components/schemas/Order" } },
                  },
                },
              },
            },
          },
          401: { description: "Authentification requise" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Passer une commande en paiement à la livraison (COD)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["confirmed", "items"],
                properties: {
                  confirmed: { type: "boolean", enum: [true], example: true },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: { type: "integer", example: 1 },
                        quantity: { type: "integer", example: 2 },
                      },
                    },
                  },
                  customerName: { type: "string", example: "Omar Fahid" },
                  customerPhone: { type: "string", example: "+212600112233" },
                  shippingAddress: { type: "string", example: "Casablanca, Maroc" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Commande créée avec succès" },
          400: { description: "Stock insuffisant ou données invalides" },
        },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Détail d'une commande (Réservé au client propriétaire ou admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Commande trouvée", content: { "application/json": { schema: { properties: { order: { $ref: "#/components/schemas/Order" } } } } } },
          404: { description: "Commande introuvable" },
        },
      },
    },
    "/api/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Annuler une commande et restituer le stock",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["confirmed"],
                properties: {
                  confirmed: { type: "boolean", enum: [true], example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Commande annulée et stock réintégré" },
          400: { description: "Commande déjà annulée ou expédiée" },
          404: { description: "Commande introuvable" },
        },
      },
    },
    "/api/orders/{id}/status": {
      patch: {
        tags: ["Orders"],
        summary: "Mettre à jour le statut d'une commande (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
                    example: "CONFIRMED",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Statut de la commande mis à jour" },
          403: { description: "Réservé aux administrateurs" },
          404: { description: "Commande introuvable" },
        },
      },
    },
    "/api/documents": {
      get: {
        tags: ["Documents"],
        summary: "Liste des documents de connaissances RAG (Admin)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Liste des documents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documents: { type: "array", items: { $ref: "#/components/schemas/Document" } },
                  },
                },
              },
            },
          },
          403: { description: "Admin uniquement" },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Déposer un document pour indexation vectorielle RAG (Admin)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "fileUrl"],
                properties: {
                  name: { type: "string", example: "Politique de retour & FAQ boutique" },
                  fileUrl: { type: "string", example: "data/faq_boutique.txt" },
                  mimeType: { type: "string", example: "text/plain" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Document enregistré pour traitement RAG" },
          403: { description: "Admin uniquement" },
        },
      },
    },
    "/api/documents/{id}": {
      get: {
        tags: ["Documents"],
        summary: "Détail d'un document RAG avec ses chunks texte (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Document et chunks trouvés" },
          404: { description: "Document introuvable" },
        },
      },
    },
    "/api/agent/chat": {
      post: {
        tags: ["Agent"],
        summary: "Discuter avec l'assistant ShopMate AI (Support SSE ou JSON)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string", example: "Avez-vous des t-shirts en coton ?" },
                  conversationId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Réponse de l'agent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    conversationId: { type: "integer" },
                    response: { type: "string" },
                  },
                },
              },
              "text/event-stream": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/api/agent/conversations": {
      get: {
        tags: ["Agent"],
        summary: "Historique des conversations du client",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Liste des conversations avec messages",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    conversations: { type: "array", items: { $ref: "#/components/schemas/Conversation" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/agent/logs": {
      get: {
        tags: ["Agent"],
        summary: "Journal d'audit des requêtes et actions de l'agent IA (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
          { name: "conversationId", in: "query", schema: { type: "integer", minimum: 1 }, description: "Filtrer les traces d'une conversation" },
          { name: "customerId", in: "query", schema: { type: "integer", minimum: 1 }, description: "Filtrer par ID du client" },
          { name: "fromDate", in: "query", schema: { type: "string", format: "date" }, description: "Inclure à partir de cette date" },
          { name: "toDate", in: "query", schema: { type: "string", format: "date" }, description: "Inclure jusqu'à cette date" },
          { name: "disposition", in: "query", schema: { type: "string", enum: ["refused", "blocked"] }, description: "Filtrer les refus ou les blocages" },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["success", "error"] } },
        ],
        responses: {
          200: {
            description: "Journal des logs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    logs: { type: "array", items: { $ref: "#/components/schemas/AgentLog" } },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: "Admin uniquement" },
        },
      },
    },
    "/api/agent/logs/{id}": {
      get: {
        tags: ["Agent"],
        summary: "Détail d'une trace de l'agent IA (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: {
          200: {
            description: "Trace complète du tour et client associé",
            content: { "application/json": { schema: { type: "object", properties: { log: { $ref: "#/components/schemas/AgentLog" }, customer: { type: "object", nullable: true } } } } },
          },
          404: { description: "Trace introuvable pour cette boutique" },
        },
      },
    },
  },
};

const swaggerRouter = Router();

// Endpoint for raw OpenAPI JSON
swaggerRouter.get("/docs/json", (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Swagger UI at /api/docs
swaggerRouter.use(
  "/docs",
  (req: Request, res: Response, next: NextFunction) => {
    // Remove CSP header specifically for Swagger UI to allow its inline scripts and styles
    res.removeHeader("Content-Security-Policy");
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "ShopMate AI — Swagger API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  })
);

export default swaggerRouter;
