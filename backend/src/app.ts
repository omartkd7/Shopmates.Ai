"use strict";

import express,{ Request , Response} from "express";

const appserver = express();

appserver.use(express.json());

appserver.get('/health' , (req: Request, res: Response) => {
    res.status(200).json({ message: ' oki Server is healthy' });
});
export default appserver;