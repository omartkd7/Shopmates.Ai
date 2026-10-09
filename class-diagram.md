# ShopMate AI — Class Diagram

> Source: `README.md` (section "Modèle de données" + "Les outils de l'agent").
> Related Jira task: **SA-43** (UML design doc).
> ⚠️ **Draft to review.** Entity names and relations come from the README.
> Attributes marked `(?)` are **my assumptions** — Omar must check them and decide.

---

## 1. Domain classes (the database model)

```mermaid
---
id: d7d24c94-5870-4566-8093-70856fd1617d
---
classDiagram
    direction TB

    class Store {
        +id
        +name
        +createdAt
    }
    class User {
        +id
        +storeId
        +email
        +passwordHash
        +role : ADMIN | CUSTOMER
    }
    class RefreshToken {
        +id
        +userId
        +tokenHash
        +expiresAt
        +revokedAt (?)
    }
    class Category {
        +id
        +storeId (?)
        +name
    }
    class Product {
        +id
        +storeId
        +categoryId
        +name
        +description
        +price
        +stock
    }
    class Customer {
        +id
        +storeId
        +name
        +phone
        +address
    }
    class Order {
        +id
        +storeId
        +customerId
        +status (?)
        +total (?)
        +createdAt
    }
    class OrderItem {
        +id
        +orderId
        +productId
        +quantity
        +unitPrice (?)
    }
    class Conversation {
        +id
        +storeId
        +createdAt
    }
    class Message {
        +id
        +conversationId
        +role (?)
        +content
        +createdAt
    }
    class Document {
        +id
        +storeId
        +title (?)
        +content
    }
    class Chunk {
        +id
        +documentId
        +content
        +embedding : vector(1536)
    }
    class AgentLog {
        +id
        +storeId (?)
        +question
        +toolsCalled
        +sources
        +latency
        +tokens
    }

    Store "1" --> "1" User : owner
    Store "1" --> "*" User : has
    Store "1" --> "*" Product
    Store "1" --> "*" Customer
    Store "1" --> "*" Order
    Store "1" --> "*" Conversation
    Store "1" --> "*" Document
    User "1" --> "*" RefreshToken
    Category "1" --> "*" Product
    Customer "1" --> "*" Order
    Order "1" *-- "*" OrderItem
    Product "1" --> "*" OrderItem
    Conversation "1" *-- "*" Message
    Document "1" *-- "*" Chunk
    Store "1" --> "*" AgentLog
```

### How to read it

| Symbol | Meaning |
|---|---|
| `"1" --> "*"` | One A has many B |
| `*--` (filled diamond) | B **cannot exist without** A (if the Order is deleted, its OrderItems go too) |
| `Customer ↔ Product` | **N—N**, solved by the middle class `OrderItem` |
| `storeId` | Multi-tenant key. It comes from the **JWT on the server**, never from the client. |

---

## 2. AI layer (backend classes, simplified)

```mermaid
classDiagram
    direction LR

    class AgentOrchestrator {
        +handleChat(question)
        -maxToolCallsPerTurn = 3
    }
    class RagService {
        +ingest(document)
        +retrieve(question, storeId)
        -chunkSize ~800
        -topK 4..6
    }
    class LlmClient {
        +generate(prompt, tools)
    }
    class ToolRegistry {
        +allowlist : 8 tools
        +validate(args) : Zod
    }
    class Guardrails {
        +checkSimilarity()
        +blockPromptInjection()
        +refuseOutOfScope()
    }
    class AuditService {
        +log(question, tools, sources)
    }
    class McpClient {
        +getShipmentStatus(orderId)
    }

    class ReadTool {
        <<interface>>
        no confirmation
    }
    class WriteTool {
        <<interface>>
        needs confirmation + transaction
    }

    AgentOrchestrator --> RagService
    AgentOrchestrator --> LlmClient
    AgentOrchestrator --> ToolRegistry
    AgentOrchestrator --> Guardrails
    AgentOrchestrator --> AuditService
    ToolRegistry --> ReadTool
    ToolRegistry --> WriteTool
    ReadTool --> McpClient : getShipmentStatus
```

### The 8 tools

| Type | Tools |
|---|---|
| **ReadTool** (no confirmation) | `searchProducts`, `getProductDetails`, `checkStock`, `getOrderStatus`, `listMyOrders`, `getShipmentStatus` (via MCP) |
| **WriteTool** (confirmation + transaction) | `createOrder`, `cancelOrder` |

---

## 3. Questions to check (Omar's homework)

1. Is `Category` linked to a `Store`? (the README ERD does **not** show it — but multi-tenant says every row should have a `storeId`)
2. Is `AgentLog` linked to `Conversation` or `User` too? (README only says it's an audit journal)
3. What are the real `Order.status` values? (for example: PENDING, CONFIRMED, DELIVERED, CANCELLED)
4. Should `Customer` be linked to `User` (customer login)? The README says roles `ADMIN` / `CUSTOMER`.
5. Which ORM: **Prisma** (README) or **Sequelize** (Jira SA-3)? The diagram is the same, but the schema file is different.
