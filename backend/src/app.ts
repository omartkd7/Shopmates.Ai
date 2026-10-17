import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOptions } from "./config/cors";
import { errorHandler, globalRateLimiter } from "./middlewares";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import categoriesRouter from "./routes/categories";
import ordersRouter from "./routes/orders";
import documentsRouter from "./routes/documents";
import agentRouter from "./routes/agent";
import swaggerRouter from "./docs/swagger";

const appserver = express();

// 1. Security Headers via Helmet
appserver.use(helmet());

// 2. Restrictive CORS
appserver.use(cors(corsOptions));

// 3. Global Rate Limiting
appserver.use(globalRateLimiter);

// 4. Body parsing
appserver.use(express.json());

// API Documentation & Specs (Swagger UI at /api/docs)
appserver.use("/api", swaggerRouter);

// API Routes
appserver.use("/api/auth", authRouter);
appserver.use("/api/products", productsRouter);
appserver.use("/api/categories", categoriesRouter);
appserver.use("/api/orders", ordersRouter);
appserver.use("/api/documents", documentsRouter);
appserver.use("/api/agent", agentRouter);

appserver.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ message: ' oki Server is healthy' });
});

// Centralized error handler (must be last)
appserver.use(errorHandler);

export default appserver;