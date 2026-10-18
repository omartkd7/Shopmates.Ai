/**
 * Best-effort manager notifications.
 *
 * The webhook is deliberately called after the database transaction commits.
 * A slow or unavailable n8n instance must never prevent a customer order.
 */
const WEBHOOK_TIMEOUT_MS = 5_000;

export interface OrderCreatedNotification {
  storeId: number;
  order: {
    id: number;
    status: string;
    total: number;
  };
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  };
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ManagerRequestNotification {
  storeId: number;
  customer: {
    userId: number;
    email: string;
  };
  category: "discount" | "refund";
  message: string;
}

type NotificationPayload =
  | ({ event: "order.created"; createdAt: string } & OrderCreatedNotification)
  | ({ event: "manager.request"; createdAt: string } & ManagerRequestNotification);

async function sendToN8n(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();
  if (!webhookUrl) return false;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.N8N_WEBHOOK_SECRET) {
      headers["X-ShopMate-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`n8n manager notification failed with HTTP ${response.status}.`);
      return false;
    }
    return true;
  } catch {
    // Do not log the payload: it can contain customer contact information.
    console.warn("n8n manager notification could not be delivered.");
    return false;
  }
}

export function notifyOrderCreated(notification: OrderCreatedNotification): Promise<boolean> {
  return sendToN8n({ event: "order.created", createdAt: new Date().toISOString(), ...notification });
}

export function notifyManagerRequest(notification: ManagerRequestNotification): Promise<boolean> {
  return sendToN8n({ event: "manager.request", createdAt: new Date().toISOString(), ...notification });
}
