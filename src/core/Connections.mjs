import http from "http";
import express from "express";
import * as path from "path";
import { fileURLToPath } from 'url';
import { Constants } from "./Constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const startServer = () => {
    const app = express();
    const httpServer = http.createServer(app);

    httpServer.listen(Constants.EXPRESS_PORT, () => {
        console.log(`Express is listening on ${Constants.EXPRESS_PORT}`);
    });

    app.use( express.static(path.join(__dirname, '../client')));
}


export { startServer };