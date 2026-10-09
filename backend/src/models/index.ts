
import Store from "./Store";
import User from "./User";
import RefreshToken from "./RefreshToken";
import Category from "./Category";
import Product from "./Product";
import Customer from "./Customer";
import Order from "./Order";
import OrderItem from "./OrderItem";
import Conversation from "./Conversation";
import Message from "./Message";
import Document from "./Document";
import Chunk from "./Chunk";
import AgentLog from "./AgentLog";

// Store -> Owner
Store.hasOne(User, {
  foreignKey: "storeId",
  as: "owner",
  onDelete: "CASCADE",
});
User.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Store -> Refresh Tokens
Store.hasMany(RefreshToken, {
  foreignKey: "storeId",
  as: "refreshTokens",
  onDelete: "CASCADE",
});
RefreshToken.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// User -> Refresh Tokens
User.hasMany(RefreshToken, {
  foreignKey: "userId",
  as: "userRefreshTokens",
  onDelete: "CASCADE",
});
RefreshToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Store -> Categories
Store.hasMany(Category, {
  foreignKey: "storeId",
  as: "categories",
  onDelete: "CASCADE",
});
Category.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Category -> Products
Category.hasMany(Product, {
  foreignKey: "categoryId",
  as: "products",
});
Product.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Store -> Products
Store.hasMany(Product, {
  foreignKey: "storeId",
  as: "products",
  onDelete: "CASCADE",
});
Product.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Store -> Customers
Store.hasMany(Customer, {
  foreignKey: "storeId",
  as: "customers",
  onDelete: "CASCADE",
});
Customer.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Customer -> Orders
Customer.hasMany(Order, {
  foreignKey: "customerId",
  as: "orders",
});
Order.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// Store -> Orders
Store.hasMany(Order, {
  foreignKey: "storeId",
  as: "orders",
  onDelete: "CASCADE",
});
Order.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Order -> Order Items
Order.hasMany(OrderItem, {
  foreignKey: "orderId",
  as: "items",
  onDelete: "CASCADE",
});
OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
});

// Product -> Order Items
Product.hasMany(OrderItem, {
  foreignKey: "productId",
  as: "orderItems",
});
OrderItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// Store -> Order Items
Store.hasMany(OrderItem, {
  foreignKey: "storeId",
  as: "orderItems",
  onDelete: "CASCADE",
});
OrderItem.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Store -> Conversations
Store.hasMany(Conversation, {
  foreignKey: "storeId",
  as: "conversations",
  onDelete: "CASCADE",
});
Conversation.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// User -> Conversations
User.hasMany(Conversation, {
  foreignKey: "userId",
  as: "conversations",
  onDelete: "CASCADE",
});
Conversation.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Conversation -> Messages
Conversation.hasMany(Message, {
  foreignKey: "conversationId",
  as: "messages",
  onDelete: "CASCADE",
});
Message.belongsTo(Conversation, {
  foreignKey: "conversationId",
  as: "conversation",
});

// Store -> Messages
Store.hasMany(Message, {
  foreignKey: "storeId",
  as: "messages",
  onDelete: "CASCADE",
});
Message.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Store -> Documents
Store.hasMany(Document, {
  foreignKey: "storeId",
  as: "documents",
  onDelete: "CASCADE",
});
Document.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// User -> Uploaded Documents
User.hasMany(Document, {
  foreignKey: "uploadedBy",
  as: "uploadedDocuments",
});
Document.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

// Document -> Chunks
Document.hasMany(Chunk, {
  foreignKey: "documentId",
  as: "chunks",
  onDelete: "CASCADE",
});
Chunk.belongsTo(Document, {
  foreignKey: "documentId",
  as: "document",
});

// Store -> Chunks
Store.hasMany(Chunk, {
  foreignKey: "storeId",
  as: "chunks",
  onDelete: "CASCADE",
});
Chunk.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

// Store -> Agent Logs
Store.hasMany(AgentLog, {
  foreignKey: "storeId",
  as: "agentLogs",
  onDelete: "CASCADE",
});
AgentLog.belongsTo(Store, {
  foreignKey: "storeId",
  as: "store",
});

export {
  Store,
  User,
  RefreshToken,
  Category,
  Product,
  Customer,
  Order,
  OrderItem,
  Conversation,
  Message,
  Document,
  Chunk,
  AgentLog,
};
