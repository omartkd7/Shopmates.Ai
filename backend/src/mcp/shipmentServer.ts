import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const PORT = Number(process.env.MCP_PORT) || 4010;

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "shopmate-shipment", version: "1.0.0" });
  server.registerTool(
    "getShipmentStatus",
    {
      description: "Retourne un statut transporteur de démonstration pour une commande déjà vérifiée par le backend ShopMate.",
      inputSchema: z.object({
        orderId: z.number().int().positive(),
        orderStatus: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
      }),
    },
    async ({ orderId, orderStatus }) => {
      const statusByOrder: Record<string, { status: string; message: string; estimatedDelivery: string | null }> = {
        PENDING: { status: "En préparation", message: "La commande est enregistrée et en attente de préparation.", estimatedDelivery: null },
        CONFIRMED: { status: "En préparation", message: "La commande est confirmée et en cours de préparation.", estimatedDelivery: new Date(Date.now() + 2 * 86_400_000).toISOString() },
        SHIPPED: { status: "Expédiée", message: "Le colis a été remis au transporteur et est en cours d'acheminement.", estimatedDelivery: new Date(Date.now() + 86_400_000).toISOString() },
        DELIVERED: { status: "Livrée", message: "Le transporteur indique que le colis a été livré.", estimatedDelivery: null },
        CANCELLED: { status: "Annulée", message: "Cette commande a été annulée; aucun colis n'est en cours d'acheminement.", estimatedDelivery: null },
      };
      const tracking = statusByOrder[orderStatus];
      const result = {
        orderId,
        orderStatus: tracking.status,
        carrier: "ShopMate Express (simulation)",
        trackingNumber: `SM-${String(orderId).padStart(6, "0")}`,
        lastUpdate: new Date().toISOString(),
        estimatedDelivery: tracking.estimatedDelivery,
        message: tracking.message,
      };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
  return server;
});

const httpServer = createServer(async (request, response) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers as HeadersInit,
      body: body.length > 0 ? body : undefined,
    });
    const webResponse = await handler.fetch(webRequest);
    response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
    if (!webResponse.body) {
      response.end();
      return;
    }
    Readable.fromWeb(webResponse.body as import("node:stream/web").ReadableStream).pipe(response);
  } catch (error) {
    console.error("MCP request failed:", error instanceof Error ? error.message : "unknown error");
    if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "MCP request failed" }));
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`ShopMate shipment MCP server listening on port ${PORT}`);
});

async function shutdown(): Promise<void> {
  await handler.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
