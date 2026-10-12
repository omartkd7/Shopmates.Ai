import express,{ Request , Response} from "express";
import { errorHandler } from "./middlewares";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";

const appserver = express();

appserver.use(express.json());
appserver.use("/api/auth", authRouter);
appserver.use("/api/products", productsRouter);

appserver.get('/health' , (req: Request, res: Response) => {
    res.status(200).json({ message: ' oki Server is healthy' });
});

// Centralized error handler (must be last)
appserver.use(errorHandler);

export default appserver;
