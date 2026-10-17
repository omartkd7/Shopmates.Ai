import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { z } from "zod";

const MCP_TIMEOUT_MS = 5_000;

const shipmentResultSchema = z.object({
  orderId: z.number().int().positive(),
  orderStatus: z.string(),
  carrier: z.string(),
  trackingNumber: z.string(),
  lastUpdate: z.string(),
  estimatedDelivery: z.string().nullable(),
  message: z.string(),
});

function fetchWithTimeout(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MCP_TIMEOUT_MS);
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) abortFromUpstream();
  else upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  });
}

/** Calls the configured MCP server and validates its result before it reaches the agent. */
export async function requestShipmentStatus(
  orderId: number,
  orderStatus: string
): Promise<z.infer<typeof shipmentResultSchema>> {
  const serverUrl = process.env.MCP_SERVER_URL;
  if (!serverUrl) throw new Error("MCP_SERVER_URL is not configured");

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    fetch: fetchWithTimeout,
  });
  const client = new Client({ name: "shopmate-backend", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "getShipmentStatus",
      arguments: { orderId, orderStatus },
    });
    if (result.isError) throw new Error("MCP shipment tool returned an error");

    const text = result.content.find((item) => item.type === "text")?.text;
    if (!text) throw new Error("MCP shipment tool returned no status data");
    const parsed = shipmentResultSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error("MCP shipment tool returned invalid status data");
    return parsed.data;
  } finally {
    await client.close().catch(() => undefined);
  }
}
