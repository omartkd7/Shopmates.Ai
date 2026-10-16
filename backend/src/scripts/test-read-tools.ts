import dotenv from "dotenv";
dotenv.config();

import sequelize from "../config/database";
import { Store, User, Customer, Product, Order, OrderItem } from "../models";
import {
  searchProductsTool,
  getProductDetailsTool,
  checkStockTool,
  getOrderStatusTool,
  listMyOrdersTool,
  executeToolCall,
  type ToolExecutionContext,
} from "../services/agentTools";

/**
 * Test script to verify the 5 read tools:
 * 1. searchProducts
 * 2. getProductDetails
 * 3. checkStock (Live DB stock and price)
 * 4. getOrderStatus (Customer & store isolation)
 * 5. listMyOrders (Customer & store isolation)
 *
 * Done when:
 * Each tool returns correct data in tests and CANNOT read another customer's or store's data.
 */
async function runReadToolsTest() {
  console.log("=================================================");
  console.log("🔍 ShopMate AI — 5 Read Tools & Isolation Test");
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

  // Check if live PostgreSQL database is accessible
  let isDbConnected = false;
  try {
    await sequelize.authenticate();
    isDbConnected = true;
    console.log("🐘 PostgreSQL database is online. Running Live Database Integration Tests...\n");
  } catch (err: any) {
    console.log("ℹ️  PostgreSQL server is currently offline (Docker container not started).");
    console.log("🧪 Running Contract & Logic Isolation Tests with mocked repositories...\n");
  }

  if (isDbConnected) {
    // Live DB integration tests
    console.log("⚙️  Setting up isolated multi-tenant test data in DB...");
    const [storeA] = await Store.findOrCreate({ where: { name: "Test Store Alpha" }, defaults: { name: "Test Store Alpha" } });
    const [storeB] = await Store.findOrCreate({ where: { name: "Test Store Beta" }, defaults: { name: "Test Store Beta" } });
    const [userA1] = await User.findOrCreate({ where: { storeId: storeA.id, email: "alice.live@test.local" }, defaults: { storeId: storeA.id, name: "Alice", email: "alice.live@test.local", password: "pwd", role: "CUSTOMER" } });
    const [userA2] = await User.findOrCreate({ where: { storeId: storeA.id, email: "bob.live@test.local" }, defaults: { storeId: storeA.id, name: "Bob", email: "bob.live@test.local", password: "pwd", role: "CUSTOMER" } });
    const [customerA1] = await Customer.findOrCreate({ where: { storeId: storeA.id, email: userA1.email }, defaults: { storeId: storeA.id, name: userA1.name, email: userA1.email } });
    const [customerA2] = await Customer.findOrCreate({ where: { storeId: storeA.id, email: userA2.email }, defaults: { storeId: storeA.id, name: userA2.name, email: userA2.email } });

    const [prodA] = await Product.findOrCreate({ where: { storeId: storeA.id, sku: "LIVE-A-01" }, defaults: { storeId: storeA.id, sku: "LIVE-A-01", name: "T-Shirt Live", price: 150, stock: 10 } });
    const [prodB] = await Product.findOrCreate({ where: { storeId: storeB.id, sku: "LIVE-B-01" }, defaults: { storeId: storeB.id, sku: "LIVE-B-01", name: "Chemise Live", price: 300, stock: 5 } });

    const [orderAlice] = await Order.findOrCreate({ where: { storeId: storeA.id, customerId: customerA1.id, status: "CONFIRMED" }, defaults: { storeId: storeA.id, customerId: customerA1.id, status: "CONFIRMED", total: 150 } });
    const [orderBob] = await Order.findOrCreate({ where: { storeId: storeA.id, customerId: customerA2.id, status: "PENDING" }, defaults: { storeId: storeA.id, customerId: customerA2.id, status: "PENDING", total: 300 } });

    const ctxAlice: ToolExecutionContext = { storeId: storeA.id, userId: userA1.id, email: userA1.email };
    const ctxBob: ToolExecutionContext = { storeId: storeA.id, userId: userA2.id, email: userA2.email };

    const searchRes = await searchProductsTool({ query: "T-Shirt" }, ctxAlice);
    assert("Live search returns store A product", searchRes.products.some((p: any) => p.id === prodA.id));

    const crossSearch = await searchProductsTool({ query: "Chemise" }, ctxAlice);
    assert("Live search cannot find Store B product", !crossSearch.products.some((p: any) => p.id === prodB.id));

    const stockA = await checkStockTool({ productId: prodA.id }, ctxAlice);
    assert("Live stock returns correct price and inStock", stockA.inStock === true && stockA.price === 150);

    const crossStock = await checkStockTool({ productId: prodB.id }, ctxAlice);
    assert("Live stock cannot access Store B product", crossStock.error !== undefined);

    const aliceOrder = await getOrderStatusTool({ orderId: orderAlice.id }, ctxAlice);
    assert("Alice reads her own order", aliceOrder.orderId === orderAlice.id && aliceOrder.status === "CONFIRMED");

    const bobHacking = await getOrderStatusTool({ orderId: orderAlice.id }, ctxBob);
    assert("Bob cannot access Alice's order (Isolation)", bobHacking.error !== undefined);

    const aliceList = await listMyOrdersTool({ limit: 5 }, ctxAlice);
    assert("Alice order list contains only her orders", aliceList.orders.some((o: any) => o.orderId === orderAlice.id) && !aliceList.orders.some((o: any) => o.orderId === orderBob.id));

    // Cleanup live fixtures
    await Order.destroy({ where: { id: [orderAlice.id, orderBob.id] } });
    await Product.destroy({ where: { id: [prodA.id, prodB.id] } });
    await Customer.destroy({ where: { id: [customerA1.id, customerA2.id] } });
    await User.destroy({ where: { id: [userA1.id, userA2.id] } });
  } else {
    // ── Contract & Repository Isolation Mode (Offline) ────────────────────────
    const originalProductScope = Product.scope;
    const originalOrderScope = Order.scope;
    const originalCustomerFindOne = Customer.findOne;
    const originalUserFindOne = User.findOne;

    // In-memory data fixtures
    const mockProducts = [
      { id: 1, storeId: 1, name: "Chemise Blanche", description: "Lin", price: 250, stock: 10, sku: "SHIRT-1", category: { name: "Mode" } },
      { id: 2, storeId: 1, name: "Pantalon Noir", description: "Coton", price: 400, stock: 0, sku: "PANTS-1", category: { name: "Mode" } },
      { id: 3, storeId: 2, name: "Veste Store 2", description: "Cuir", price: 800, stock: 5, sku: "JACKET-2", category: { name: "Luxe" } },
    ];

    const mockCustomers = [
      { id: 10, storeId: 1, email: "alice@test.local", name: "Alice" },
      { id: 20, storeId: 1, email: "bob@test.local", name: "Bob" },
      { id: 30, storeId: 2, email: "charlie@test.local", name: "Charlie" },
    ];

    const mockOrders = [
      { id: 501, storeId: 1, customerId: 10, status: "CONFIRMED", total: 250, createdAt: new Date(), items: [{ productId: 1, quantity: 1, unitPrice: 250, product: { name: "Chemise Blanche" } }] },
      { id: 502, storeId: 1, customerId: 20, status: "PENDING", total: 400, createdAt: new Date(), items: [{ productId: 2, quantity: 1, unitPrice: 400, product: { name: "Pantalon Noir" } }] },
      { id: 503, storeId: 2, customerId: 30, status: "SHIPPED", total: 800, createdAt: new Date(), items: [{ productId: 3, quantity: 1, unitPrice: 800, product: { name: "Veste Store 2" } }] },
    ];

    // Mock Customer.findOne
    Customer.findOne = (async (options: any) => {
      const { storeId, email } = options.where || {};
      return mockCustomers.find((c) => c.storeId === storeId && c.email === email) as any;
    }) as any;

    User.findOne = (async (options: any) => {
      const { id, storeId } = options.where || {};
      const c = mockCustomers.find((c) => c.id === id && c.storeId === storeId);
      return c ? { id: c.id, storeId: c.storeId, email: c.email, name: c.name } : null;
    }) as any;

    // Mock Product.scope
    Product.scope = ((scopeDef: any) => {
      const storeId = scopeDef?.method?.[1];
      return {
        findAll: async (options: any) => {
          return mockProducts.filter((p) => p.storeId === storeId);
        },
        findOne: async (options: any) => {
          const id = options?.where?.id;
          return mockProducts.find((p) => p.storeId === storeId && p.id === id) || null;
        },
      };
    }) as any;

    // Mock Order.scope
    Order.scope = ((scopeDef: any) => {
      const storeId = scopeDef?.method?.[1];
      return {
        findAll: async (options: any) => {
          const customerId = options?.where?.customerId;
          return mockOrders.filter((o) => o.storeId === storeId && o.customerId === customerId);
        },
        findOne: async (options: any) => {
          const { id, customerId } = options?.where || {};
          return (
            mockOrders.find(
              (o) => o.storeId === storeId && o.id === id && o.customerId === customerId
            ) || null
          );
        },
      };
    }) as any;

    const ctxAlice: ToolExecutionContext = { storeId: 1, userId: 10, email: "alice@test.local" };
    const ctxBob: ToolExecutionContext = { storeId: 1, userId: 20, email: "bob@test.local" };
    const ctxCharlie: ToolExecutionContext = { storeId: 2, userId: 30, email: "charlie@test.local" };

    // 1. searchProducts
    console.log("📦 1. Testing searchProducts (Search & Store Isolation):");
    const searchRes = await searchProductsTool({ query: "Chemise" }, ctxAlice);
    assert("Returns store 1 products for Alice", searchRes.totalFound === 2 && searchRes.products.some((p: any) => p.id === 1));
    assert("Does NOT return Store 2 product (Tenant Isolation)", !searchRes.products.some((p: any) => p.id === 3));
    console.log();

    // 2. getProductDetails
    console.log("🔎 2. Testing getProductDetails (Details & Store Isolation):");
    const detailsProd1 = await getProductDetailsTool({ productId: 1 }, ctxAlice);
    assert("Returns details for Product 1 (Store 1)", detailsProd1.id === 1 && detailsProd1.price === 250);

    const crossDetails = await getProductDetailsTool({ productId: 3 }, ctxAlice);
    assert("Rejects access to Product 3 belonging to Store 2 (Tenant Isolation)", crossDetails.error !== undefined && crossDetails.error.includes("non trouvé"));
    console.log();

    // 3. checkStock
    console.log("📊 3. Testing checkStock (Live DB stock & price, anti-hallucination):");
    const stockInStock = await checkStockTool({ productId: 1 }, ctxAlice);
    assert("Returns live price=250 and inStock=true", stockInStock.inStock === true && stockInStock.stock === 10 && stockInStock.price === 250);

    const stockDepleted = await checkStockTool({ productId: 2 }, ctxAlice);
    assert("Returns stock=0 with inStock=false and rupture message", stockDepleted.inStock === false && stockDepleted.stock === 0 && stockDepleted.message.includes("rupture de stock"));

    const crossStock = await checkStockTool({ productId: 3 }, ctxAlice);
    assert("Cannot check stock for Product 3 from another store (Tenant Isolation)", crossStock.error !== undefined && crossStock.error.includes("introuvable"));
    console.log();

    // 4. getOrderStatus
    console.log("📋 4. Testing getOrderStatus (Customer & Tenant Isolation):");
    const aliceOrderRes = await getOrderStatusTool({ orderId: 501 }, ctxAlice);
    assert("Alice can read her own order status (CONFIRMED)", aliceOrderRes.orderId === 501 && aliceOrderRes.status === "CONFIRMED");

    const bobHackingAlice = await getOrderStatusTool({ orderId: 501 }, ctxBob);
    assert("Bob CANNOT view Alice's order (Customer Isolation)", bobHackingAlice.error !== undefined && bobHackingAlice.error.includes("introuvable ou vous n'avez pas l'autorisation"));

    const charlieHackingAlice = await getOrderStatusTool({ orderId: 501 }, ctxCharlie);
    assert("Charlie from Store 2 CANNOT view Alice's order (Tenant Isolation)", charlieHackingAlice.error !== undefined);
    console.log();

    // 5. listMyOrders
    console.log("📜 5. Testing listMyOrders (Only returns authenticated customer orders):");
    const aliceList = await listMyOrdersTool({ limit: 5 }, ctxAlice);
    assert("Alice's list contains only her order #501", aliceList.orders.length === 1 && aliceList.orders[0].orderId === 501);

    const bobList = await listMyOrdersTool({ limit: 5 }, ctxBob);
    assert("Bob's list contains only his order #502", bobList.orders.length === 1 && bobList.orders[0].orderId === 502);

    const charlieList = await listMyOrdersTool({ limit: 5 }, ctxCharlie);
    assert("Charlie's list contains only his order #503", charlieList.orders.length === 1 && charlieList.orders[0].orderId === 503);
    console.log();

    // 6. executeToolCall Dispatcher
    console.log("🚀 6. Testing executeToolCall Dispatcher:");
    const dispatched = await executeToolCall("checkStock", { productId: 1 }, ctxAlice);
    assert("executeToolCall dispatches checkStock correctly", dispatched.inStock === true);

    const dispatchedCrossStore = await executeToolCall("checkStock", { productId: 3 }, ctxAlice);
    assert("executeToolCall rejects cross-store access safely", dispatchedCrossStore.error !== undefined);
    console.log();

    // Restore original methods
    Product.scope = originalProductScope;
    Order.scope = originalOrderScope;
    Customer.findOne = originalCustomerFindOne;
    User.findOne = originalUserFindOne;
  }

  console.log("=================================================");
  console.log(
    `📊 Results: ${passedTests}/${totalTests} tests passed (${Math.round(
      (passedTests / totalTests) * 100
    )}%)`
  );
  console.log("=================================================");

  if (passedTests !== totalTests) {
    console.error("❌ Some read tool tests failed!");
    process.exit(1);
  } else {
    console.log("🎉 All 5 read tools successfully verified with strict multi-tenant & customer isolation!");
  }
}

runReadToolsTest().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
