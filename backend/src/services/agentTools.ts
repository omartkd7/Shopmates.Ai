import type { LLMTool } from "./llm";
import {
  searchProductsToolSchema,
  getProductDetailsToolSchema,
  checkStockToolSchema,
  createOrderToolSchema,
  getOrderStatusToolSchema,
  listMyOrdersToolSchema,
  cancelOrderToolSchema,
  getShipmentStatusToolSchema,
  type SearchProductsArgs,
  type GetProductDetailsArgs,
  type CheckStockArgs,
  type CreateOrderArgs,
  type GetOrderStatusArgs,
  type ListMyOrdersArgs,
  type CancelOrderArgs,
  type GetShipmentStatusArgs,
} from "../schemas/agentTools";
import { z } from "zod";
import { Op } from "sequelize";
import { Product, Order, OrderItem, Customer, User, forStore } from "../models";

/**
 * Allowlist of the exact 8 tools that ShopMate AI is permitted to invoke.
 * Any other tool requested by the model is strictly rejected.
 */
export const ALLOWED_TOOLS = [
  "searchProducts",
  "getProductDetails",
  "checkStock",
  "createOrder",
  "getOrderStatus",
  "listMyOrders",
  "cancelOrder",
  "getShipmentStatus",
] as const;

export type AllowedToolName = (typeof ALLOWED_TOOLS)[number];

export function isAllowedTool(name: string): name is AllowedToolName {
  return (ALLOWED_TOOLS as readonly string[]).includes(name);
}

/**
 * Maximum tool calls allowed per single conversation turn to avoid runaway loops / cost abuse.
 */
export const MAX_TOOL_CALLS_PER_TURN = 3;

import {
  initiateCreateOrderRecap,
  initiateCancelOrderRecap,
  executeConfirmedAction,
} from "./orderConfirmation";

/**
 * Context injected strictly server-side from JWT authentication.
 * The model NEVER controls or provides these values.
 */
export interface ToolExecutionContext {
  storeId: number;
  userId: number;
  email?: string;
  conversationId?: number;
}

/**
 * Map of tool name to corresponding Zod validation schema.
 */
export const TOOL_SCHEMAS: Record<AllowedToolName, z.ZodTypeAny> = {
  searchProducts: searchProductsToolSchema,
  getProductDetails: getProductDetailsToolSchema,
  checkStock: checkStockToolSchema,
  createOrder: createOrderToolSchema,
  getOrderStatus: getOrderStatusToolSchema,
  listMyOrders: listMyOrdersToolSchema,
  cancelOrder: cancelOrderToolSchema,
  getShipmentStatus: getShipmentStatusToolSchema,
};

/**
 * OpenAI-compatible tool definitions passed to the LLM.
 */
export const AGENT_TOOLS: LLMTool[] = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Rechercher des produits dans le catalogue par mot-clé, catégorie ou fourchette de prix.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Terme de recherche (nom ou description du produit)",
          },
          categoryId: {
            type: "number",
            description: "Identifiant optionnel de la catégorie",
          },
          minPrice: {
            type: "number",
            description: "Prix minimum en Dirhams (DH)",
          },
          maxPrice: {
            type: "number",
            description: "Prix maximum en Dirhams (DH)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductDetails",
      description:
        "Consulter les détails complets d'un produit spécifique (prix, description, variantes, catégorie).",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "number",
            description: "Identifiant unique du produit",
          },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkStock",
      description:
        "Consulter le stock réel et le prix exact en direct de la base de données. Toujours utiliser cet outil avant d'annoncer un prix ou confirmer une disponibilité.",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "number",
            description: "Identifiant unique du produit à vérifier",
          },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createOrder",
      description:
        "Créer une commande en paiement à la livraison (COD). ATTENTION : Nécessite impérativement la confirmation explicite du client (confirmed=true).",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "number", description: "ID du produit" },
                quantity: { type: "number", description: "Quantité souhaitée (min 1)" },
              },
              required: ["productId", "quantity"],
            },
            description: "Liste des articles à commander",
          },
          customerName: { type: "string", description: "Nom complet du destinataire" },
          customerPhone: { type: "string", description: "Téléphone pour la livraison" },
          shippingAddress: { type: "string", description: "Adresse de livraison au Maroc" },
          confirmed: {
            type: "boolean",
            description:
              "Doit valoir true UNIQUEMENT si le client a clairement et explicitement confirmé vouloir passer la commande.",
          },
        },
        required: ["items", "confirmed"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description: "Consulter le statut d'une commande appartenant au client connecté.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
            description: "Identifiant unique de la commande",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listMyOrders",
      description: "Consulter l'historique des commandes récentes du client connecté.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de commandes à renvoyer (par défaut 5, max 20)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancelOrder",
      description:
        "Annuler une commande en cours. ATTENTION : Nécessite la confirmation explicite du client (confirmed=true).",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
            description: "Identifiant de la commande à annuler",
          },
          confirmed: {
            type: "boolean",
            description:
              "Doit valoir true UNIQUEMENT si le client a confirmé l'annulation de sa commande.",
          },
        },
        required: ["orderId", "confirmed"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getShipmentStatus",
      description:
        "Consulter le statut d'expédition et le suivi transporteur d'un colis auprès du service de livraison.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
            description: "Numéro de la commande associée",
          },
          trackingNumber: {
            type: "string",
            description: "Numéro de suivi transporteur",
          },
        },
      },
    },
  },
];

/**
 * Result of tool call validation.
 */
export type ToolValidationResult =
  | {
      success: true;
      toolName: AllowedToolName;
      args: any;
      context: ToolExecutionContext;
    }
  | {
      success: false;
      toolName: string;
      error: string;
    };

/**
 * Validate an incoming tool call from the LLM against the allowlist and Zod schema.
 * Rejects unknown tools, malformed arguments, or invalid schemas with safe, descriptive errors.
 * Injects tenant and customer identity strictly server-side.
 */
export function validateToolCall(
  name: string,
  rawArguments: string | Record<string, any>,
  context: ToolExecutionContext
): ToolValidationResult {
  // 1. Allowlist check
  if (!isAllowedTool(name)) {
    return {
      success: false,
      toolName: name,
      error: `Outil inconnu ou non autorisé : "${name}". L'agent ne peut invoquer que les 8 outils autorisés.`,
    };
  }

  // 2. Parse arguments if passed as JSON string
  let parsedArgs: Record<string, any>;
  if (typeof rawArguments === "string") {
    try {
      parsedArgs = rawArguments.trim() ? JSON.parse(rawArguments) : {};
    } catch {
      return {
        success: false,
        toolName: name,
        error: `Arguments d'outil mal formatés (JSON invalide) pour l'outil "${name}".`,
      };
    }
  } else {
    parsedArgs = rawArguments || {};
  }

  // 3. Security Guardrail: Strip any model-injected tenant or customer identity
  // storeId and userId MUST ALWAYS come from the server session context!
  delete parsedArgs.storeId;
  delete parsedArgs.userId;
  delete parsedArgs.customerId;

  // 4. Validate against Zod schema
  const schema = TOOL_SCHEMAS[name];
  const parseResult = schema.safeParse(parsedArgs);

  if (!parseResult.success) {
    const formattedErrors = parseResult.error.issues
      .map((issue) => `${issue.path.join(".") || "arguments"}: ${issue.message}`)
      .join(", ");

    return {
      success: false,
      toolName: name,
      error: `Validation échouée pour "${name}" : ${formattedErrors}`,
    };
  }

  return {
    success: true,
    toolName: name,
    args: parseResult.data,
    context: {
      storeId: context.storeId,
      userId: context.userId,
      email: context.email,
      conversationId: context.conversationId,
    },
  };
}

// ─── Customer Resolution Helper ───────────────────────────────────────────────

/**
 * Resolves or creates the Customer record associated with the authenticated User.
 * Strictly bounded by storeId and the user's verified identity.
 */
export async function getCustomerForContext(
  context: ToolExecutionContext
): Promise<Customer | null> {
  const { storeId, userId, email } = context;

  if (email) {
    const existingCustomer = await Customer.findOne({
      where: { storeId, email },
    });
    if (existingCustomer) return existingCustomer;
  }

  const user = await User.findOne({
    where: { id: userId, storeId },
  });
  if (!user) return null;

  const [customer] = await Customer.findOrCreate({
    where: { storeId, email: user.email },
    defaults: {
      storeId,
      email: user.email,
      name: user.name,
    },
  });

  return customer;
}

// ─── The 5 Read Tools Implementations ─────────────────────────────────────────

/**
 * 1. searchProducts
 * Searches store catalogue by query, category, or price range.
 * Scoped strictly by storeId.
 */
export async function searchProductsTool(
  args: SearchProductsArgs,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const whereClause: any = {};

  if (args.query) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${args.query}%` } },
      { description: { [Op.iLike]: `%${args.query}%` } },
    ];
  }

  if (args.categoryId) {
    whereClause.categoryId = args.categoryId;
  }

  if (args.minPrice !== undefined || args.maxPrice !== undefined) {
    const priceFilter: any = {};
    if (args.minPrice !== undefined) priceFilter[Op.gte] = args.minPrice;
    if (args.maxPrice !== undefined) priceFilter[Op.lte] = args.maxPrice;
    whereClause.price = priceFilter;
  }

  const products = (await forStore(Product, context.storeId).findAll({
    where: whereClause,
    include: [
      {
        association: "category",
        attributes: ["id", "name"],
        required: false,
      },
    ],
    limit: 10,
    order: [["id", "ASC"]],
  })) as Product[];

  return {
    storeId: context.storeId,
    totalFound: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      stock: p.stock,
      inStock: p.stock > 0,
      category: (p as any).category ? (p as any).category.name : null,
    })),
  };
}

/**
 * 2. getProductDetails
 * Retrieve full details of a single product.
 * Returns error if product does not exist in the current store.
 */
export async function getProductDetailsTool(
  args: GetProductDetailsArgs,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const product = (await forStore(Product, context.storeId).findOne({
    where: { id: args.productId },
    include: [
      {
        association: "category",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  })) as Product | null;

  if (!product) {
    return {
      error: `Produit #${args.productId} non trouvé dans cette boutique.`,
    };
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    inStock: product.stock > 0,
    sku: product.sku,
    category: (product as any).category ? (product as any).category.name : null,
  };
}

/**
 * 3. checkStock
 * Live database query for price and stock availability.
 * Never hallucinated or guessed by the model.
 */
export async function checkStockTool(
  args: CheckStockArgs,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const product = (await forStore(Product, context.storeId).findOne({
    where: { id: args.productId },
    attributes: ["id", "name", "price", "stock"],
  })) as Product | null;

  if (!product) {
    return {
      error: `Produit #${args.productId} introuvable dans cette boutique.`,
    };
  }

  const inStock = product.stock > 0;
  return {
    productId: product.id,
    name: product.name,
    price: Number(product.price),
    stock: product.stock,
    inStock,
    message: inStock
      ? `Le produit "${product.name}" est disponible en stock (${product.stock} unité(s)) au prix de ${product.price} DH.`
      : `Le produit "${product.name}" est actuellement en rupture de stock.`,
  };
}

/**
 * 4. getOrderStatus
 * Checks status of an order for the authenticated customer only.
 * Returns safe error if the order belongs to another customer or store.
 */
export async function getOrderStatusTool(
  args: GetOrderStatusArgs,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const customer = await getCustomerForContext(context);
  if (!customer) {
    return {
      error: "Aucun profil client trouvé pour ce compte.",
    };
  }

  // Strict tenant AND customer isolation
  const order = (await forStore(Order, context.storeId).findOne({
    where: {
      id: args.orderId,
      customerId: customer.id,
    },
    include: [
      {
        association: "items",
        include: [
          {
            association: "product",
            attributes: ["id", "name", "price"],
          },
        ],
      },
    ],
  })) as Order | null;

  if (!order) {
    return {
      error: `Commande #${args.orderId} introuvable ou vous n'avez pas l'autorisation d'y accéder.`,
    };
  }

  return {
    orderId: order.id,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    items: ((order as any).items || []).map((item: any) => ({
      name: item.product?.name ?? `Article #${item.productId}`,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  };
}

/**
 * 5. listMyOrders
 * Lists recent orders belonging exclusively to the authenticated customer.
 */
export async function listMyOrdersTool(
  args: ListMyOrdersArgs,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const customer = await getCustomerForContext(context);
  if (!customer) {
    return { orders: [] };
  }

  const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);

  const orders = (await forStore(Order, context.storeId).findAll({
    where: { customerId: customer.id },
    limit,
    order: [["createdAt", "DESC"]],
    include: [
      {
        association: "items",
        include: [
          {
            association: "product",
            attributes: ["id", "name", "price"],
          },
        ],
      },
    ],
  })) as Order[];

  return {
    orders: orders.map((o) => ({
      orderId: o.id,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt,
      itemsCount: ((o as any).items || []).length,
    })),
  };
}

// ─── Tool Dispatcher ──────────────────────────────────────────────────────────

/**
 * Dispatcher: Validates tool call arguments with Zod and executes the tool.
 * Returns safe JSON result or safe error object.
 */
export async function executeToolCall(
  name: string,
  rawArguments: string | Record<string, any>,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const validation = validateToolCall(name, rawArguments, context);
  if (!validation.success) {
    return { error: validation.error };
  }

  try {
    switch (validation.toolName) {
      case "searchProducts":
        return await searchProductsTool(validation.args, validation.context);
      case "getProductDetails":
        return await getProductDetailsTool(validation.args, validation.context);
      case "checkStock":
        return await checkStockTool(validation.args, validation.context);
      case "getOrderStatus":
        return await getOrderStatusTool(validation.args, validation.context);
      case "listMyOrders":
        return await listMyOrdersTool(validation.args, validation.context);
      case "createOrder": {
        const convId = context.conversationId || 0;
        if (!validation.args.confirmed) {
          // Never write on the first request: produce recap & ask confirmation
          return await initiateCreateOrderRecap(validation.args, {
            ...validation.context,
            conversationId: convId,
          });
        }
        // Write happens only after explicit confirmation
        return await executeConfirmedAction(convId, validation.context);
      }
      case "cancelOrder": {
        const convId = context.conversationId || 0;
        if (!validation.args.confirmed) {
          return await initiateCancelOrderRecap(validation.args, {
            ...validation.context,
            conversationId: convId,
          });
        }
        return await executeConfirmedAction(convId, validation.context);
      }
      case "getShipmentStatus":
        return {
          status: "mcp_tracking_pending",
          message: "Suivi transporteur via MCP en cours d'intégration.",
        };
      default:
        return { error: `Outil non supporté: ${name}` };
    }
  } catch (err: any) {
    return {
      error: `Erreur lors de l'exécution de l'outil "${name}" : ${err.message}`,
    };
  }
}

