import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOptions } from "./config/cors";
import { errorHandler, globalRateLimiter } from "./middlewares";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";

const appserver = express();

// 1. Security Headers via Helmet
appserver.use(helmet());

// 2. Restrictive CORS
appserver.use(cors(corsOptions));

// 3. Global Rate Limiting
appserver.use(globalRateLimiter);

// 4. Body parsing
appserver.use(express.json());

appserver.use("/api/auth", authRouter);
appserver.use("/api/products", productsRouter);

appserver.get('/health' , (req: Request, res: Response) => {
    res.status(200).json({ message: ' oki Server is healthy' });
});

// Centralized error handler (must be last)
appserver.use(errorHandler);

export default appserver;
