import { z } from "zod";

/**
 * Zod schemas for the 8 ShopMate AI agent tools.
 * All arguments from LLM tool-calls MUST be strictly validated
 * against these schemas before any database or service execution.
 */

// 1. searchProducts
export const searchProductsToolSchema = z.object({
  query: z.string().trim().min(1, "Le mot-clé de recherche ne peut pas être vide").optional(),
  categoryId: z.coerce.number().int().positive("L'ID de catégorie doit être un entier positif").optional(),
  minPrice: z.coerce.number().min(0, "Le prix minimum doit être positif").optional(),
  maxPrice: z.coerce.number().min(0, "Le prix maximum doit être positif").optional(),
});

// 2. getProductDetails
export const getProductDetailsToolSchema = z.object({
  productId: z.coerce.number().int().positive("L'identifiant du produit (productId) doit être un entier positif"),
});

// 3. checkStock
export const checkStockToolSchema = z.object({
  productId: z.coerce.number().int().positive("L'identifiant du produit (productId) doit être un entier positif"),
});

// 4. createOrder (Requires explicit client confirmation)
export const createOrderToolSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive("L'identifiant du produit doit être un entier positif"),
        quantity: z.coerce.number().int().min(1, "La quantité doit être au moins 1"),
      })
    )
    .min(1, "La commande doit contenir au moins un article"),
  customerName: z.string().trim().min(2, "Le nom du client est trop court").optional(),
  customerPhone: z.string().trim().min(6, "Numéro de téléphone invalide").optional(),
  shippingAddress: z.string().trim().min(5, "Adresse de livraison requise").optional(),
  confirmed: z.boolean().describe("Confirmation explicite requise du client avant de valider la commande"),
});

// 5. getOrderStatus
export const getOrderStatusToolSchema = z.object({
  orderId: z.coerce.number().int().positive("L'identifiant de commande (orderId) doit être un entier positif"),
});

// 6. listMyOrders
export const listMyOrdersToolSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

// 7. cancelOrder (Requires explicit client confirmation)
export const cancelOrderToolSchema = z.object({
  orderId: z.coerce.number().int().positive("L'identifiant de commande (orderId) doit être un entier positif"),
  confirmed: z.boolean().describe("Confirmation explicite requise du client avant d'annuler la commande"),
});

// 8. getShipmentStatus (Via carrier / MCP)
export const getShipmentStatusToolSchema = z
  .object({
    orderId: z.coerce.number().int().positive().optional(),
  })
  .describe("orderId est facultatif : si absent, le serveur retrouve la dernière commande du client connecté.");

// Inferred TypeScript input types
export type SearchProductsArgs = z.infer<typeof searchProductsToolSchema>;
export type GetProductDetailsArgs = z.infer<typeof getProductDetailsToolSchema>;
export type CheckStockArgs = z.infer<typeof checkStockToolSchema>;
export type CreateOrderArgs = z.infer<typeof createOrderToolSchema>;
export type GetOrderStatusArgs = z.infer<typeof getOrderStatusToolSchema>;
export type ListMyOrdersArgs = z.infer<typeof listMyOrdersToolSchema>;
export type CancelOrderArgs = z.infer<typeof cancelOrderToolSchema>;
export type GetShipmentStatusArgs = z.infer<typeof getShipmentStatusToolSchema>;
