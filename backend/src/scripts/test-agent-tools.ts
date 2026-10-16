import {
  validateToolCall,
  ALLOWED_TOOLS,
  AGENT_TOOLS,
  type ToolExecutionContext,
} from "../services/agentTools";

/**
 * Test script to verify:
 * 1. Allowlist enforcement (unknown tools rejected)
 * 2. Zod validation enforcement (invalid arguments rejected with safe error)
 * 3. Server-side storeId / userId injection (model cannot inject or override identity)
 * 4. Successful validation for valid tool calls
 *
 * Can be run via:
 *   npx tsx src/scripts/test-agent-tools.ts
 *   or: npm run test:tools
 */
async function runAgentToolsTest() {
  console.log("=================================================");
  console.log("🛠️  ShopMate AI — Agent Tools & Allowlist Test");
  console.log("=================================================\n");

  const mockContext: ToolExecutionContext = {
    storeId: 1,
    userId: 42,
  };

  let passedTests = 0;
  let totalTests = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`   ✅ PASS: ${title}`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: ${title}${detail ? ` (${detail})` : ""}`);
    }
  }

  // 1. Verify Allowlist (Exactly 8 tools)
  console.log("📋 1. Checking Allowlist & Tool Definitions:");
  assert("Allowlist has exactly 8 tools", ALLOWED_TOOLS.length === 8);
  assert("AGENT_TOOLS definitions count is 8", AGENT_TOOLS.length === 8);
  console.log();

  // 2. Reject Unknown Tools
  console.log("🚫 2. Rejection of Unknown / Unauthorized Tools:");
  const unknown1 = validateToolCall("deleteStoreDatabase", {}, mockContext);
  assert(
    "Unknown tool 'deleteStoreDatabase' is rejected",
    !unknown1.success && unknown1.error.includes("Outil inconnu ou non autorisé")
  );

  const unknown2 = validateToolCall("applyDiscount", { discountPercent: 50 }, mockContext);
  assert(
    "Unauthorized tool 'applyDiscount' is rejected",
    !unknown2.success && unknown2.error.includes("Outil inconnu ou non autorisé")
  );
  console.log();

  // 3. Reject Malformed JSON Arguments
  console.log("⚠️  3. Rejection of Malformed Arguments:");
  const malformed = validateToolCall("checkStock", "{ productId: 123 ", mockContext);
  assert(
    "Malformed JSON string is rejected with safe error",
    !malformed.success && malformed.error.includes("mal formatés")
  );
  console.log();

  // 4. Reject Invalid Arguments via Zod Schema
  console.log("🛡️  4. Zod Schema Validation Guardrails:");
  
  // checkStock with negative or missing productId
  const invalidStock = validateToolCall("checkStock", { productId: -1 }, mockContext);
  assert(
    "checkStock with negative productId is rejected",
    !invalidStock.success && invalidStock.error.includes("Validation échouée")
  );

  // createOrder with empty items array
  const emptyOrder = validateToolCall(
    "createOrder",
    { items: [], confirmed: true },
    mockContext
  );
  assert(
    "createOrder with empty items array is rejected",
    !emptyOrder.success && emptyOrder.error.includes("Validation échouée")
  );

  // createOrder without boolean confirmed flag
  const unconfirmedOrder = validateToolCall(
    "createOrder",
    { items: [{ productId: 1, quantity: 2 }] },
    mockContext
  );
  assert(
    "createOrder without explicit confirmation flag is rejected",
    !unconfirmedOrder.success && unconfirmedOrder.error.includes("confirmed")
  );

  // cancelOrder without orderId
  const invalidCancel = validateToolCall("cancelOrder", { confirmed: true }, mockContext);
  assert(
    "cancelOrder without orderId is rejected",
    !invalidCancel.success && invalidCancel.error.includes("orderId")
  );

  // getShipmentStatus without orderId and without trackingNumber
  const invalidShipment = validateToolCall("getShipmentStatus", {}, mockContext);
  assert(
    "getShipmentStatus without tracking or orderId is rejected",
    !invalidShipment.success && invalidShipment.error.includes("Validation échouée")
  );
  console.log();

  // 5. Tenant & Customer Identity Injection (Security Guardrail)
  console.log("🔒 5. Server-Side Identity Injection & Anti-Spoofing:");
  const spoofAttempt = validateToolCall(
    "checkStock",
    { productId: 5, storeId: 9999, userId: 8888 }, // Attacker trying to spoof tenant/customer
    mockContext
  );
  assert(
    "Spoofed storeId and userId stripped, server context preserved",
    spoofAttempt.success &&
      spoofAttempt.context.storeId === 1 &&
      spoofAttempt.context.userId === 42 &&
      (spoofAttempt.args as any).storeId === undefined &&
      (spoofAttempt.args as any).userId === undefined
  );
  console.log();

  // 6. Valid Tool Calls Execution
  console.log("✨ 6. Validation of Legitimate Tool Calls:");
  const validSearch = validateToolCall(
    "searchProducts",
    JSON.stringify({ query: "Veste en cuir", minPrice: 200 }),
    mockContext
  );
  assert("Valid searchProducts tool call accepted", validSearch.success);

  const validStock = validateToolCall(
    "checkStock",
    JSON.stringify({ productId: 10 }),
    mockContext
  );
  assert("Valid checkStock tool call accepted", validStock.success);

  const validCreateOrder = validateToolCall(
    "createOrder",
    {
      items: [{ productId: 10, quantity: 1 }],
      customerName: "Omar Fahid",
      customerPhone: "0612345678",
      shippingAddress: "Casablanca, Maarif",
      confirmed: true,
    },
    mockContext
  );
  assert("Valid createOrder tool call accepted", validCreateOrder.success);

  const validListOrders = validateToolCall(
    "listMyOrders",
    { limit: 3 },
    mockContext
  );
  assert("Valid listMyOrders tool call accepted", validListOrders.success);

  console.log("\n=================================================");
  console.log(
    `📊 Results: ${passedTests}/${totalTests} tests passed (${Math.round(
      (passedTests / totalTests) * 100
    )}%)`
  );
  console.log("=================================================");

  if (passedTests !== totalTests) {
    console.error("❌ Some agent tool tests failed!");
    process.exit(1);
  } else {
    console.log("🎉 All 8 tool schemas, allowlist, and guardrails validated successfully!");
  }
}

runAgentToolsTest().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
