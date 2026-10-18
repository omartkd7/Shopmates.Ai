import assert from "node:assert/strict";
import http from "node:http";
import { notifyManagerRequest, notifyOrderCreated } from "../services/n8nNotifications";

async function main(): Promise<void> {
  let received: { headers: http.IncomingHttpHeaders; payload: any } | null = null;
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      received = { headers: req.headers, payload: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
      res.writeHead(204).end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");

  const oldUrl = process.env.N8N_WEBHOOK_URL;
  const oldSecret = process.env.N8N_WEBHOOK_SECRET;
  process.env.N8N_WEBHOOK_URL = `http://127.0.0.1:${address.port}/webhook`;
  process.env.N8N_WEBHOOK_SECRET = "test-webhook-secret";

  try {
    assert.equal(await notifyOrderCreated({
      storeId: 7,
      order: { id: 42, status: "CONFIRMED", total: 199 },
      customer: { id: 12, name: "Test Customer", email: "customer@example.test", phone: "0600000000" },
      items: [{ productId: 3, name: "Test product", quantity: 2, unitPrice: 99.5 }],
    }), true);
    assert(received);
    const captured = received as { headers: http.IncomingHttpHeaders; payload: any };
    assert.equal(captured.headers["x-shopmate-webhook-secret"], "test-webhook-secret");
    assert.equal(captured.payload.event, "order.created");
    assert.equal(captured.payload.order.id, 42);

    delete process.env.N8N_WEBHOOK_URL;
    assert.equal(await notifyManagerRequest({
      storeId: 7,
      customer: { userId: 5, email: "customer@example.test" },
      category: "discount",
      message: "Fais-moi une remise de 50 DH",
    }), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (oldUrl === undefined) delete process.env.N8N_WEBHOOK_URL;
    else process.env.N8N_WEBHOOK_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.N8N_WEBHOOK_SECRET;
    else process.env.N8N_WEBHOOK_SECRET = oldSecret;
  }

  console.log("n8n notification checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
