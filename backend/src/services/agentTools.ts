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

/**
 * Context injected strictly server-side from JWT authentication.
 * The model NEVER controls or provides these values.
 */
export interface ToolExecutionContext {
  storeId: number;
  userId: number;
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
    },
  };
}
