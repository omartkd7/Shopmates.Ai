import bcrypt from "bcryptjs";
import sequelize from "./config/database";
import { DEMO_ADMIN_EMAIL, DEMO_STORE_NAME } from "./config/demo";
import {
  Category,
  Chunk,
  Document,
  Product,
  Store,
  User,
} from "./models";

const categoryDefinitions = [
  { name: "Clothing", description: "Everyday clothing and basics." },
  { name: "Shoes", description: "Shoes for daily use and sport." },
  { name: "Accessories", description: "Practical accessories." },
  { name: "Home", description: "Useful items for the home." },
];

const productDefinitions = [
  { sku: "DEMO-TSHIRT-001", category: "Clothing", name: "Classic cotton T-shirt", description: "Soft cotton T-shirt in several sizes.", price: 129, stock: 24 },
  { sku: "DEMO-TSHIRT-002", category: "Clothing", name: "Long-sleeve T-shirt", description: "Light long-sleeve top for everyday wear.", price: 159, stock: 18 },
  { sku: "DEMO-SHIRT-001", category: "Clothing", name: "Oxford shirt", description: "Button-up shirt with a regular fit.", price: 249, stock: 12 },
  { sku: "DEMO-HOODIE-001", category: "Clothing", name: "Everyday hoodie", description: "Warm pullover hoodie with a front pocket.", price: 329, stock: 10 },
  { sku: "DEMO-JEANS-001", category: "Clothing", name: "Straight-fit jeans", description: "Classic denim with a straight fit.", price: 299, stock: 14 },
  { sku: "DEMO-DRESS-001", category: "Clothing", name: "Casual dress", description: "Comfortable knee-length dress.", price: 279, stock: 9 },
  { sku: "DEMO-SNEAKER-001", category: "Shoes", name: "Daily sneakers", description: "Lightweight sneakers for everyday use.", price: 399, stock: 11 },
  { sku: "DEMO-SNEAKER-002", category: "Shoes", name: "Running sneakers", description: "Cushioned shoes for light running.", price: 549, stock: 8 },
  { sku: "DEMO-SANDAL-001", category: "Shoes", name: "Comfort sandals", description: "Adjustable sandals with a cushioned footbed.", price: 229, stock: 16 },
  { sku: "DEMO-BELT-001", category: "Accessories", name: "Classic belt", description: "Adjustable everyday belt.", price: 119, stock: 20 },
  { sku: "DEMO-BAG-001", category: "Accessories", name: "Canvas tote bag", description: "Reusable canvas bag with reinforced handles.", price: 89, stock: 30 },
  { sku: "DEMO-WALLET-001", category: "Accessories", name: "Compact wallet", description: "Small wallet with card slots and a coin pocket.", price: 139, stock: 13 },
  { sku: "DEMO-BOTTLE-001", category: "Home", name: "Insulated water bottle", description: "Reusable bottle for hot and cold drinks.", price: 169, stock: 17 },
  { sku: "DEMO-LAMP-001", category: "Home", name: "Desk lamp", description: "Compact LED lamp with adjustable angle.", price: 219, stock: 7 },
  { sku: "DEMO-PILLOW-001", category: "Home", name: "Cotton cushion cover", description: "Soft removable cover for a standard cushion.", price: 99, stock: 22 },
];

const knowledgeDocuments = [
  {
    name: "Delivery policy",
    fileUrl: "demo://knowledge/delivery-policy",
    content:
      "Delivery is available in the cities listed by the shop. Orders are usually delivered within 1 to 3 business days after confirmation. The delivery agent may call the customer before arrival. Cash on delivery is available for eligible orders. Delivery times are estimates and may change during holidays or bad weather.",
  },
  {
    name: "Returns and exchanges",
    fileUrl: "demo://knowledge/returns-policy",
    content:
      "A customer may request a return or exchange within 7 days of delivery. Items must be unused and returned with their original packaging. Contact the shop with the order number before sending an item back. Refunds and exchanges are confirmed by the shop after inspection. This is sample demo policy text and must be replaced with the shop's real policy.",
  },
  {
    name: "Size guide",
    fileUrl: "demo://knowledge/size-guide",
    content:
      "For tops, measure around the chest and compare the result with the product size chart. For trousers, measure the waist at its natural position. If you are between two sizes, choose the larger size for a looser fit. Shoe sizes can vary by model; check the product page or ask the shop before ordering. These are general demo recommendations, not product-specific measurements.",
  },
  {
    name: "Frequently asked questions",
    fileUrl: "demo://knowledge/faq",
    content:
      "How can I pay? Cash on delivery is available for eligible orders. How do I track an order? Contact the shop with your order number. Can I change an order? Contact the shop as soon as possible; changes depend on whether the order has shipped. Are prices current? The product catalog is the source of current prices and stock. This is sample FAQ content for the demo store.",
  },
];

async function seed(): Promise<void> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error(
      "Set SEED_ADMIN_PASSWORD to at least 12 characters before running the seed."
    );
  }

  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await sequelize.transaction(async (transaction) => {
    const [store] = await Store.findOrCreate({
      where: { name: DEMO_STORE_NAME },
      defaults: { name: DEMO_STORE_NAME },
      transaction,
    });

    let admin = await User.findOne({
      where: { storeId: store.id, email: DEMO_ADMIN_EMAIL },
      transaction,
    });

    if (admin) {
      await admin.update(
        { name: "Demo Admin", password: passwordHash },
        { transaction }
      );
    } else {
      admin = await User.create(
        {
          storeId: store.id,
          name: "Demo Admin",
          email: DEMO_ADMIN_EMAIL,
          password: passwordHash,
        },
        { transaction }
      );
    }

    const categories = new Map<string, Category>();
    for (const definition of categoryDefinitions) {
      const [category] = await Category.findOrCreate({
        where: { storeId: store.id, name: definition.name },
        defaults: { storeId: store.id, ...definition },
        transaction,
      });
      categories.set(definition.name, category);
    }

    for (const definition of productDefinitions) {
      const category = categories.get(definition.category);
      if (!category) {
        throw new Error(`Missing seeded category: ${definition.category}`);
      }

      await Product.findOrCreate({
        where: { storeId: store.id, sku: definition.sku },
        defaults: {
          storeId: store.id,
          categoryId: category.id,
          name: definition.name,
          description: definition.description,
          price: definition.price,
          stock: definition.stock,
          sku: definition.sku,
        },
        transaction,
      });
    }

    for (const definition of knowledgeDocuments) {
      const [document] = await Document.findOrCreate({
        where: { storeId: store.id, fileUrl: definition.fileUrl },
        defaults: {
          storeId: store.id,
          uploadedBy: admin.id,
          name: definition.name,
          fileUrl: definition.fileUrl,
          mimeType: "text/plain",
          status: "pending",
        },
        transaction,
      });

      await Chunk.findOrCreate({
        where: { storeId: store.id, documentId: document.id },
        defaults: {
          storeId: store.id,
          documentId: document.id,
          content: definition.content,
          embedding: null,
        },
        transaction,
      });
    }
  });

  console.log(
    `Seed complete: 1 demo store, 1 admin (${DEMO_ADMIN_EMAIL}), 4 categories, ${productDefinitions.length} products, and ${knowledgeDocuments.length} knowledge documents.`
  );
}

seed()
  .catch((error: unknown) => {
    console.error(
      "Seed failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });