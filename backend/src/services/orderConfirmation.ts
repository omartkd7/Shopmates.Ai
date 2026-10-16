import crypto from "crypto";
import sequelize from "../config/database";
import { Product, Order, OrderItem, Customer, User, forStore } from "../models";
import type { ToolExecutionContext } from "./agentTools";
import type { CreateOrderArgs, CancelOrderArgs } from "../schemas/agentTools";
import { getCustomerForContext } from "./agentTools";

export interface PendingOrderAction {
  token: string;
  conversationId: number;
  storeId: number;
  userId: number;
  action: "createOrder" | "cancelOrder";
  args: CreateOrderArgs | CancelOrderArgs;
  recapText: string;
  totalAmount?: number;
  createdAt: number;
  executed: boolean;
  executedResult?: any;
}

// In-memory pending confirmation store keyed by conversationId
const pendingConfirmations = new Map<number, PendingOrderAction>();

// Confirmation TTL: 15 minutes
const CONFIRMATION_TTL_MS = 15 * 60 * 1000;

/**
 * Checks if the user's message is an explicit confirmation
 * in French or Moroccan Darija.
 */
export function isAffirmativeConfirmation(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const affirmativeTokens = [
    "oui",
    "yes",
    "ouais",
    "d'accord",
    "daccord",
    "je confirme",
    "confirmer",
    "confirme",
    "valider",
    "je valide",
    "ok",
    "okay",
    "c'est bon",
    "cest bon",
    // Moroccan Darija:
    "wah",
    "iyeh",
    "wakha",
    "safi",
    "ah",
  ];

  return affirmativeTokens.some(
    (token) =>
      normalized === token ||
      normalized.startsWith(token + " ") ||
      normalized.endsWith(" " + token) ||
      normalized.includes(" " + token + " ")
  );
}

/**
 * Checks if a conversation currently has a pending unconfirmed action.
 */
export function hasPendingConfirmation(conversationId: number): boolean {
  const pending = pendingConfirmations.get(conversationId);
  if (!pending) return false;

  // Check TTL
  if (Date.now() - pending.createdAt > CONFIRMATION_TTL_MS) {
    pendingConfirmations.delete(conversationId);
    return false;
  }

  return !pending.executed;
}

export function getPendingConfirmation(
  conversationId: number
): PendingOrderAction | undefined {
  const pending = pendingConfirmations.get(conversationId);
  if (!pending) return undefined;

  if (Date.now() - pending.createdAt > CONFIRMATION_TTL_MS) {
    pendingConfirmations.delete(conversationId);
    return undefined;
  }

  return pending;
}

/**
 * Step 1: Prepare order recap without writing to DB.
 * Verifies live stock and price directly from the database.
 * Stores a pending confirmation token tied to the conversation.
 */
export async function initiateCreateOrderRecap(
  args: CreateOrderArgs,
  context: ToolExecutionContext & { conversationId: number }
): Promise<{
  requiresConfirmation: true;
  confirmationToken: string;
  recap: string;
  total: number;
}> {
  const { storeId, conversationId } = context;

  let calculatedTotal = 0;
  const itemsSummary: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }> = [];

  // Live stock and price verification
  for (const item of args.items) {
    const product = (await forStore(Product, storeId).findOne({
      where: { id: item.productId },
      attributes: ["id", "name", "price", "stock"],
    })) as Product | null;

    if (!product) {
      throw new Error(`Produit #${item.productId} introuvable dans cette boutique.`);
    }

    if (product.stock < item.quantity) {
      throw new Error(
        `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}, demandé : ${item.quantity}.`
      );
    }

    const unitPrice = Number(product.price);
    const subtotal = unitPrice * item.quantity;
    calculatedTotal += subtotal;

    itemsSummary.push({
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal,
    });
  }

  const token = `CONF_ORD_${conversationId}_${crypto.randomBytes(8).toString("hex")}`;

  const address = args.shippingAddress || "Casablanca (à préciser lors de la livraison)";
  const phone = args.customerPhone || "Numéro du profil client";

  const recap = [
    `📋 **Récapitulatif de votre commande en paiement à la livraison (COD) :**`,
    ...itemsSummary.map(
      (it) => `• **${it.name}** × ${it.quantity} — ${it.subtotal} DH (${it.unitPrice} DH/unité)`
    ),
    `• **Total à payer à la livraison :** **${calculatedTotal} DH**`,
    `• **Mode de paiement :** Paiement en espèces à la livraison (COD)`,
    `• **Adresse :** ${address}`,
    `• **Téléphone :** ${phone}`,
    ``,
    `👉 **Confirmez-vous cette commande ?** Répondez par **« Oui »** pour valider l'envoi.`,
  ].join("\n");

  // Save pending action in memory tied to conversation
  pendingConfirmations.set(conversationId, {
    token,
    conversationId,
    storeId,
    userId: context.userId,
    action: "createOrder",
    args,
    recapText: recap,
    totalAmount: calculatedTotal,
    createdAt: Date.now(),
    executed: false,
  });

  return {
    requiresConfirmation: true,
    confirmationToken: token,
    recap,
    total: calculatedTotal,
  };
}

/**
 * Step 1 (Cancel): Prepare cancellation recap without writing to DB.
 */
export async function initiateCancelOrderRecap(
  args: CancelOrderArgs,
  context: ToolExecutionContext & { conversationId: number }
): Promise<{
  requiresConfirmation: true;
  confirmationToken: string;
  recap: string;
}> {
  const { storeId, conversationId } = context;
  const customer = await getCustomerForContext(context);
  if (!customer) {
    throw new Error("Profil client introuvable.");
  }

  const order = (await forStore(Order, storeId).findOne({
    where: { id: args.orderId, customerId: customer.id },
  })) as Order | null;

  if (!order) {
    throw new Error(`Commande #${args.orderId} introuvable ou vous n'avez pas l'autorisation d'y accéder.`);
  }

  if (order.status === "CANCELLED") {
    throw new Error(`La commande #${args.orderId} est déjà annulée.`);
  }

  if (order.status === "DELIVERED") {
    throw new Error(`Impossible d'annuler une commande déjà livrée.`);
  }

  const token = `CONF_CANCEL_${conversationId}_${crypto.randomBytes(8).toString("hex")}`;

  const recap = [
    `⚠️ **Confirmation d'annulation :**`,
    `Vous êtes sur le point d'annuler la commande **#${order.id}** (Montant : ${order.total} DH, statut actuel : ${order.status}).`,
    ``,
    `👉 **Confirmez-vous l'annulation définitive de cette commande ?** Répondez par **« Oui »** pour valider.`,
  ].join("\n");

  pendingConfirmations.set(conversationId, {
    token,
    conversationId,
    storeId,
    userId: context.userId,
    action: "cancelOrder",
    args,
    recapText: recap,
    createdAt: Date.now(),
    executed: false,
  });

  return {
    requiresConfirmation: true,
    confirmationToken: token,
    recap,
  };
}

/**
 * Step 2: Executes the pending action ONLY after explicit confirmation.
 * Runs inside a database transaction with row-level locking.
 * Guarantees idempotency (retrying with the same pending confirmation returns existing order).
 */
export async function executeConfirmedAction(
  conversationId: number,
  context: ToolExecutionContext
): Promise<Record<string, any>> {
  const pending = pendingConfirmations.get(conversationId);

  if (!pending) {
    return {
      error: "Aucune action en attente de confirmation pour cette conversation.",
    };
  }

  // Idempotency: If already executed, return cached result without writing again!
  if (pending.executed && pending.executedResult) {
    return {
      ...pending.executedResult,
      idempotentRetry: true,
      message: `Votre commande #${pending.executedResult.orderId} est déjà enregistrée.`,
    };
  }

  const { storeId } = context;

  if (pending.action === "createOrder") {
    const args = pending.args as CreateOrderArgs;

    const result = await sequelize.transaction(async (t) => {
      const customer = await getCustomerForContext(context);
      if (!customer) {
        throw new Error("Impossible de résoudre le profil client.");
      }

      let total = 0;
      const orderItemsToInsert: Array<{
        storeId: number;
        customerId: number;
        productId: number;
        quantity: number;
        unitPrice: number;
      }> = [];

      // Lock products and verify stock within transaction
      for (const item of args.items) {
        const product = (await Product.findOne({
          where: { id: item.productId, storeId },
          transaction: t,
          lock: t.LOCK.UPDATE, // Row-level pessimistic lock
        })) as Product | null;

        if (!product) {
          throw new Error(`Produit #${item.productId} introuvable dans cette boutique.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}, demandé : ${item.quantity}.`
          );
        }

        const unitPrice = Number(product.price);
        total += unitPrice * item.quantity;

        // Decrement stock
        await product.decrement("stock", { by: item.quantity, transaction: t });

        orderItemsToInsert.push({
          storeId,
          customerId: customer.id,
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
        });
      }

      // Create Order in DB
      const order = await Order.create(
        {
          storeId,
          customerId: customer.id,
          status: "CONFIRMED",
          total,
        },
        { transaction: t }
      );

      // Create OrderItems
      await OrderItem.bulkCreate(
        orderItemsToInsert.map((item) => ({
          ...item,
          orderId: order.id,
        })),
        { transaction: t }
      );

      return {
        success: true,
        orderId: order.id,
        status: order.status,
        total,
        message: `✅ Commande #${order.id} validée avec succès ! Total : ${total} DH (Paiement à la livraison).`,
      };
    });

    // Mark as executed for idempotency
    pending.executed = true;
    pending.executedResult = result;

    return result;
  }

  if (pending.action === "cancelOrder") {
    const args = pending.args as CancelOrderArgs;

    const result = await sequelize.transaction(async (t) => {
      const customer = await getCustomerForContext(context);
      if (!customer) {
        throw new Error("Profil client introuvable.");
      }

      const order = (await Order.findOne({
        where: { id: args.orderId, storeId, customerId: customer.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      })) as Order | null;

      if (!order) {
        throw new Error("Commande introuvable ou non autorisée.");
      }

      if (order.status === "CANCELLED") {
        throw new Error("Cette commande est déjà annulée.");
      }

      // Restore stock for items
      const items = (await OrderItem.findAll({
        where: { orderId: order.id },
        transaction: t,
      })) as OrderItem[];

      for (const item of items) {
        const product = (await Product.findOne({
          where: { id: item.productId, storeId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        })) as Product | null;

        if (product) {
          await product.increment("stock", { by: item.quantity, transaction: t });
        }
      }

      await order.update({ status: "CANCELLED" }, { transaction: t });

      return {
        success: true,
        orderId: order.id,
        status: "CANCELLED",
        message: `✅ La commande #${order.id} a été annulée avec succès et les stocks ont été réintégrés.`,
      };
    });

    pending.executed = true;
    pending.executedResult = result;

    return result;
  }

  return { error: "Action inconnue." };
}
