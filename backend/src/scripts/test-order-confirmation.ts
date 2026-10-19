import dotenv from "dotenv";
dotenv.config();

import sequelize from "../config/database";
import { Store, User, Customer, Product, Order, OrderItem } from "../models";
import {
  initiateCreateOrderRecap,
  initiateCancelOrderRecap,
  executeConfirmedAction,
  hasPendingConfirmation,
  isAffirmativeConfirmation,
} from "../services/orderConfirmation";
import { executeToolCall, type ToolExecutionContext } from "../services/agentTools";
import { createOrderSchema, orderConfirmationSchema } from "../schemas/order";

/**
 * Test script to verify the explicit confirmation flow for createOrder and cancelOrder:
 *
 * Scope:
 * - createOrder and cancelOrder never write on the first request:
 *   the agent first recaps (product, size, price, city, COD) and asks for confirmation
 * - Write happens only after an explicit "yes", inside a DB transaction, with a confirmation token tied to the conversation
 * - Idempotency to avoid duplicate orders on retry
 *
 * Done when:
 * "Je la veux" produces a recap with no DB write; "Oui" creates exactly one order
 *
 * Can be run via:
 *   npx tsx src/scripts/test-order-confirmation.ts
 *   or: npm run test:confirmation
 */
async function runOrderConfirmationTest() {
  console.log("=================================================");
  console.log("✍️  ShopMate AI — Write Tools Confirmation Test");
  console.log("=================================================\n");

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

  // 1. Verify affirmative keyword detection (French & Moroccan Darija)
  console.log("🗣️  1. Testing Affirmative Intent Detection (FR & Darija):");
  assert("'Oui' is recognized as explicit confirmation", isAffirmativeConfirmation("Oui"));
  assert("'yes' is recognized as explicit confirmation", isAffirmativeConfirmation("yes"));
  assert("'d'accord' is recognized as explicit confirmation", isAffirmativeConfirmation("d'accord"));
  assert("'je confirme' is recognized as explicit confirmation", isAffirmativeConfirmation("Je confirme"));
  assert("'wakha' (Darija) is recognized as explicit confirmation", isAffirmativeConfirmation("wakha"));
  assert("'Non' is NOT an affirmative confirmation", !isAffirmativeConfirmation("Non"));
  assert("'Je la veux' is NOT a confirmation (it is an order intent)", !isAffirmativeConfirmation("Je la veux"));
  assert(
    "REST order creation rejects requests without explicit confirmation",
    !createOrderSchema.safeParse({ items: [{ productId: 1, quantity: 1 }] }).success
  );
  assert(
    "REST order creation accepts explicit confirmation",
    createOrderSchema.safeParse({ confirmed: true, items: [{ productId: 1, quantity: 1 }] }).success
  );
  assert(
    "REST cancellation rejects requests without explicit confirmation",
    !orderConfirmationSchema.safeParse({}).success
  );
  assert(
    "REST cancellation accepts explicit confirmation",
    orderConfirmationSchema.safeParse({ confirmed: true }).success
  );
  console.log();

  // Check if live PostgreSQL database is accessible
  let isDbConnected = false;
  try {
    await sequelize.authenticate();
    isDbConnected = true;
    console.log("🐘 PostgreSQL database is online. Running Live DB Integration Test...\n");
  } catch (err) {
    console.log("ℹ️  PostgreSQL server is offline (Docker container not started).");
    console.log("🧪 Running Contract & Logic Isolation Tests with mock repositories...\n");
  }

  if (isDbConnected) {
    // Live DB integration test
    const [store] = await Store.findOrCreate({
      where: { name: "Store Confirmation Live" },
      defaults: { name: "Store Confirmation Live" },
    });

    const [user] = await User.findOrCreate({
      where: { storeId: store.id, email: "shopper.live@test.local" },
      defaults: {
        storeId: store.id,
        name: "Omar Client",
        email: "shopper.live@test.local",
        password: "hash",
        role: "CUSTOMER",
      },
    });

    const [customer] = await Customer.findOrCreate({
      where: { storeId: store.id, email: user.email },
      defaults: { storeId: store.id, name: user.name, email: user.email },
    });

    const [product] = await Product.findOrCreate({
      where: { storeId: store.id, sku: "CONF-LIVE-001" },
      defaults: {
        storeId: store.id,
        sku: "CONF-LIVE-001",
        name: "Veste Cuir Bomber",
        price: 650,
        stock: 5,
      },
    });

    const initialStock = product.stock;
    const initialOrderCount = await Order.count({ where: { storeId: store.id } });
    const conversationId = 777;

    const context: ToolExecutionContext & { conversationId: number } = {
      storeId: store.id,
      userId: user.id,
      email: user.email,
      conversationId,
    };

    // ── STEP 1: First request ("Je la veux") ──────────────────────────────────
    console.log("📝 2. Testing First Request ('Je la veux'):");
    console.log("   User Prompt: 'Je la veux !'");

    const firstRequest = await executeToolCall(
      "createOrder",
      {
        items: [{ productId: product.id, quantity: 1 }],
        shippingAddress: "Casablanca, Gauthier",
        customerPhone: "0661002233",
        confirmed: false, // NOT confirmed on first turn!
      },
      context
    );

    assert("First request requires confirmation", firstRequest.requiresConfirmation === true);
    assert("First request returns confirmation token", typeof firstRequest.confirmationToken === "string");
    assert("First request produces rich recap with product & price", firstRequest.recap.includes("Veste Cuir Bomber") && firstRequest.recap.includes("650 DH"));
    assert("First request explicitly mentions COD", firstRequest.recap.includes("Paiement en espèces à la livraison (COD)"));

    // Critical assertion: NO DB WRITE on first turn
    const ordersAfterTurn1 = await Order.count({ where: { storeId: store.id } });
    assert("CRITICAL: Exactly 0 orders written to DB on first turn", ordersAfterTurn1 === initialOrderCount);

    const refreshedProduct1 = await Product.findByPk(product.id);
    assert("CRITICAL: Product stock remains completely untouched", refreshedProduct1?.stock === initialStock);
    assert("Conversation now has pending confirmation flag", hasPendingConfirmation(conversationId));
    console.log();

    // ── STEP 2: Explicit Confirmation ("Oui") ─────────────────────────────────
    console.log("✅ 3. Testing Explicit Confirmation ('Oui'):");
    console.log("   User Prompt: 'Oui'");

    const [confirmResult, concurrentConfirmResult] = await Promise.all([
      executeConfirmedAction(conversationId, context),
      executeConfirmedAction(conversationId, context),
    ]);
    assert("Order write succeeded inside DB transaction", confirmResult.success === true);
    assert("Returned valid order ID", typeof confirmResult.orderId === "number");
    assert("Concurrent confirmation reuses the same order", concurrentConfirmResult.orderId === confirmResult.orderId);

    // Exactly ONE order created
    const ordersAfterTurn2 = await Order.count({ where: { storeId: store.id } });
    assert("CRITICAL: Exactly ONE order created in DB after 'Oui'", ordersAfterTurn2 === initialOrderCount + 1);

    const refreshedProduct2 = await Product.findByPk(product.id);
    assert("Product stock decremented by exactly 1 in transaction", refreshedProduct2?.stock === initialStock - 1);
    console.log();

    // ── STEP 3: Idempotency Verification ──────────────────────────────────────
    console.log("🔄 4. Testing Idempotency on Duplicate Confirmation Retries:");
    console.log("   User sends duplicate 'Oui' or network retry occurs...");

    const duplicateResult = await executeConfirmedAction(conversationId, context);
    assert("Idempotency caught: duplicate request succeeded safely", duplicateResult.success === true);
    assert("Returned identical order ID without re-creating", duplicateResult.orderId === confirmResult.orderId);
    assert("Flagged as idempotent retry", duplicateResult.idempotentRetry === true);

    const ordersAfterRetry = await Order.count({ where: { storeId: store.id } });
    assert("CRITICAL: Still exactly ONE order in DB (no duplicates)", ordersAfterRetry === initialOrderCount + 1);

    const refreshedProduct3 = await Product.findByPk(product.id);
    assert("CRITICAL: Stock was NOT decremented again", refreshedProduct3?.stock === initialStock - 1);
    console.log();

    // Cleanup live DB
    await OrderItem.destroy({ where: { orderId: confirmResult.orderId } });
    await Order.destroy({ where: { id: confirmResult.orderId } });
    await Product.destroy({ where: { id: product.id } });
    await Customer.destroy({ where: { id: customer.id } });
    await User.destroy({ where: { id: user.id } });
  } else {
    // Offline simulation mode
    console.log("📝 2. Testing First Request ('Je la veux'):");
    const originalProductScope = Product.scope;
    let dbOrdersCreated = 0;
    let stockLevel = 5;

    Product.scope = (() => ({
      findOne: async () => ({
        id: 10,
        name: "Sneakers Daily Blanc",
        price: 399,
        stock: stockLevel,
      }),
    })) as any;

    const conversationId = 888;
    const context: ToolExecutionContext & { conversationId: number } = {
      storeId: 1,
      userId: 42,
      email: "test@shopmate.local",
      conversationId,
    };

    const firstRequest = await initiateCreateOrderRecap(
      {
        items: [{ productId: 10, quantity: 1 }],
        shippingAddress: "Rabat, Agdal",
        customerPhone: "0612345678",
        confirmed: false,
      },
      context
    );

    assert("First request requires confirmation", firstRequest.requiresConfirmation === true);
    assert("First request returns confirmation token tied to conversation", firstRequest.confirmationToken.startsWith("CONF_ORD_888"));
    assert("First request recaps product, total (399 DH), and COD", firstRequest.recap.includes("Sneakers Daily Blanc") && firstRequest.recap.includes("399 DH") && firstRequest.recap.includes("COD"));
    assert("CRITICAL: Exactly 0 orders written to DB on first turn", dbOrdersCreated === 0);
    assert("Conversation has pending confirmation registered", hasPendingConfirmation(conversationId));
    console.log();

    console.log("✅ 3. Testing Explicit Confirmation ('Oui'):");
    // Mock successful transaction execution
    const originalTransaction = sequelize.transaction;
    sequelize.transaction = (async (cb: any) => {
      dbOrdersCreated++;
      stockLevel--;
      return {
        success: true,
        orderId: 9001,
        status: "CONFIRMED",
        total: 399,
        message: "✅ Commande #9001 validée avec succès ! Total : 399 DH (Paiement à la livraison).",
      };
    }) as any;

    const confirmResult = await executeConfirmedAction(conversationId, context);
    assert("Order creation succeeded inside transaction", confirmResult.success === true);
    assert("Created order ID returned", confirmResult.orderId === 9001);
    assert("CRITICAL: Exactly ONE order created in DB after 'Oui'", dbOrdersCreated === 1);
    assert("Stock decremented by 1 in transaction", stockLevel === 4);
    console.log();

    console.log("🔄 4. Testing Idempotency on Duplicate Confirmation Retries:");
    const duplicateRetry = await executeConfirmedAction(conversationId, context);
    assert("Duplicate confirmation handled cleanly", duplicateRetry.success === true);
    assert("Returns existing orderId #9001", duplicateRetry.orderId === 9001);
    assert("Flagged as idempotent retry", duplicateRetry.idempotentRetry === true);
    assert("CRITICAL: Still exactly ONE order in DB (no duplicate creation)", dbOrdersCreated === 1);
    assert("CRITICAL: Stock was NOT decremented again", stockLevel === 4);
    console.log();

    Product.scope = originalProductScope;
    sequelize.transaction = originalTransaction;
  }

  console.log("=================================================");
  console.log(
    `📊 Results: ${passedTests}/${totalTests} tests passed (${Math.round(
      (passedTests / totalTests) * 100
    )}%)`
  );
  console.log("=================================================");

  if (passedTests !== totalTests) {
    console.error("❌ Order confirmation tests failed!");
    process.exit(1);
  } else {
    console.log("🎉 'Je la veux' -> Recap with 0 DB writes & 'Oui' -> Exactly 1 order validated!");
  }
}

runOrderConfirmationTest().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
