import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import bcrypt from "bcryptjs";
import authRouter from "../routes/auth";
import productsRouter from "../routes/products";
import ordersRouter from "../routes/orders";
import { signAccessToken, hashToken } from "../config/jwt";
import { Customer, Order, Product, RefreshToken, Store, User } from "../models";

type RefreshRecord = {
  token: string;
  userId: number;
  storeId: number;
  expiresAt: Date;
  destroy: () => Promise<void>;
};

const records = new Map<string, RefreshRecord>();
const testUser = {
  id: 101,
  storeId: 1,
  name: "Customer A",
  email: "customer.a@example.test",
  password: "",
  role: "CUSTOMER" as const,
};

async function start(app: express.Express) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function request(baseUrl: string, path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function testAuthRotationAndLogout(): Promise<void> {
  testUser.password = await bcrypt.hash("correct-password", 10);
  records.clear();

  const original = {
    storeFindOne: Store.findOne,
    userFindOne: User.findOne,
    userFindByPk: User.findByPk,
    refreshCreate: RefreshToken.create,
    refreshFindOne: RefreshToken.findOne,
    refreshDestroy: RefreshToken.destroy,
  };

  (Store as any).findOne = async () => ({ id: 1, name: "ShopMate Demo Store" });
  (User as any).findOne = async ({ where }: any) => where.email === testUser.email ? testUser : null;
  (User as any).findByPk = async (id: number) => id === testUser.id ? testUser : null;
  (RefreshToken as any).create = async (data: Omit<RefreshRecord, "destroy">) => {
    const record: RefreshRecord = {
      ...data,
      destroy: async () => { records.delete(record.token); },
    };
    records.set(record.token, record);
    return record;
  };
  (RefreshToken as any).findOne = async ({ where }: any) => records.get(where.token) ?? null;
  (RefreshToken as any).destroy = async ({ where }: any) => Number(records.delete(where.token));

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  const server = await start(app);

  try {
    const login = await request(server.baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: testUser.email, password: "correct-password" }),
    });
    assert.equal(login.status, 200, "login should issue a token pair");
    const firstPair = await login.json() as { refreshToken: string };
    assert(firstPair.refreshToken);

    const refresh = await request(server.baseUrl, "/api/auth/refresh", {
      method: "POST", body: JSON.stringify({ refreshToken: firstPair.refreshToken }),
    });
    assert.equal(refresh.status, 200, "a valid refresh token should rotate");
    const secondPair = await refresh.json() as { refreshToken: string };
    assert.notEqual(secondPair.refreshToken, firstPair.refreshToken, "rotation must issue a new raw token");

    const reuse = await request(server.baseUrl, "/api/auth/refresh", {
      method: "POST", body: JSON.stringify({ refreshToken: firstPair.refreshToken }),
    });
    assert.equal(reuse.status, 401, "the old refresh token must be rejected after rotation");

    const logout = await request(server.baseUrl, "/api/auth/logout", {
      method: "POST", body: JSON.stringify({ refreshToken: secondPair.refreshToken }),
    });
    assert.equal(logout.status, 200, "logout should revoke the current refresh token");

    const afterLogout = await request(server.baseUrl, "/api/auth/refresh", {
      method: "POST", body: JSON.stringify({ refreshToken: secondPair.refreshToken }),
    });
    assert.equal(afterLogout.status, 401, "a logged-out refresh token must be rejected");
  } finally {
    await server.close();
    Store.findOne = original.storeFindOne;
    User.findOne = original.userFindOne;
    User.findByPk = original.userFindByPk;
    RefreshToken.create = original.refreshCreate;
    RefreshToken.findOne = original.refreshFindOne;
    RefreshToken.destroy = original.refreshDestroy;
  }
}

async function testTenantAndOrderIsolation(): Promise<void> {
  const original = {
    productScope: Product.scope,
    orderScope: Order.scope,
    customerFindOne: Customer.findOne,
  };
  const requestedProductStores: number[] = [];
  const requestedOrderStores: number[] = [];

  (Product as any).scope = ({ method }: any) => {
    const storeId = method[1];
    requestedProductStores.push(storeId);
    return {
      findOne: async ({ where }: any) =>
        storeId === 1 && where.id === 1
          ? { id: 1, storeId: 1, name: "Store A product", price: 99, stock: 3 }
          : null,
    };
  };
  (Order as any).scope = ({ method }: any) => {
    const storeId = method[1];
    requestedOrderStores.push(storeId);
    return {
      findOne: async ({ where }: any) =>
        storeId === 1 && where.id === 1
          ? { id: 1, storeId: 1, customerId: 501, status: "PENDING", total: 99 }
          : null,
      findAll: async () => [],
    };
  };
  (Customer as any).findOne = async ({ where }: any) =>
    where.storeId === 1 && where.email === testUser.email ? { id: 501 } : null;

  const app = express();
  app.use(express.json());
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  const server = await start(app);
  const token = signAccessToken({ userId: testUser.id, storeId: 1, role: "CUSTOMER", email: testUser.email });
  const authorization = { Authorization: `Bearer ${token}` };

  try {
    const ownProduct = await request(server.baseUrl, "/api/products/1?storeId=2", { headers: authorization });
    assert.equal(ownProduct.status, 200, "store A can read its own product");
    assert.equal(requestedProductStores.at(-1), 1, "client storeId must be ignored for product reads");

    const otherStoreProduct = await request(server.baseUrl, "/api/products/2?storeId=2", { headers: authorization });
    assert.equal(otherStoreProduct.status, 404, "store A cannot read store B products");
    assert.equal(requestedProductStores.at(-1), 1, "product lookup must stay in store A scope");

    const ownOrder = await request(server.baseUrl, "/api/orders/1", { headers: authorization });
    assert.equal(ownOrder.status, 200, "customer A can read their own order");

    const anotherCustomerOrder = await request(server.baseUrl, "/api/orders/2", { headers: authorization });
    assert.equal(anotherCustomerOrder.status, 404, "customer A cannot read another customer's order");
    assert(requestedOrderStores.every((storeId) => storeId === 1), "order queries must use the JWT store scope");
  } finally {
    await server.close();
    Product.scope = original.productScope;
    Order.scope = original.orderScope;
    Customer.findOne = original.customerFindOne;
  }
}

async function main(): Promise<void> {
  await testAuthRotationAndLogout();
  console.log("PASS auth login, refresh rotation, old-token rejection, and logout revocation");
  await testTenantAndOrderIsolation();
  console.log("PASS product store scope and customer-order isolation");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
