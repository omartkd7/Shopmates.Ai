import express from "express";
import type { AddressInfo } from "node:net";
import { agentRateLimiter } from "../middlewares/rateLimiter";
import { canCallAnotherTool, MAX_TOOL_CALLS_PER_TURN } from "../services/agentTools";
import { MAX_TOKENS_PER_TURN } from "../services/llm";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
}

async function run(): Promise<void> {
  assert("per-turn output cap is set to 1024 tokens", MAX_TOKENS_PER_TURN === 1024);
  assert("tool call limit is exactly three", MAX_TOOL_CALLS_PER_TURN === 3);
  assert("tool calls 1 through 3 are permitted", canCallAnotherTool(0) && canCallAnotherTool(1) && canCallAnotherTool(2));
  assert("a fourth tool call is blocked", !canCallAnotherTool(3));

  const app = express();
  const testUserId = Math.floor(Date.now() + Math.random() * 100000);
  app.use((req, _res, next) => {
    (req as any).user = { userId: testUserId, storeId: 1, role: "CUSTOMER", email: "rate-limit-test@example.invalid" };
    next();
  });
  app.post("/api/agent/chat", agentRateLimiter, (_req, res) => res.status(200).json({ accepted: true }));

  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/api/agent/chat`;
    const statuses: number[] = [];
    let lastBody = "";
    for (let i = 0; i < 21; i += 1) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", connection: "close" },
        body: JSON.stringify({ message: `message ${i + 1}` }),
      });
      statuses.push(response.status);
      lastBody = await response.text();
    }

    assert("first 20 messages are accepted", statuses.slice(0, 20).every((status) => status === 200));
    assert("the 21st message receives HTTP 429", statuses[20] === 429);
    assert("429 response contains a mobile-friendly message", lastBody.includes("max 20 messages / minute"));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
