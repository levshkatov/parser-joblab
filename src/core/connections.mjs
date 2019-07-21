import http from "http";
import express from "express";
import WebSocket from "ws";
import * as path from "path";
import { fileURLToPath } from 'url';
import { Constants } from "./Constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let app = {};
let wss = {};

const startServer = () => {

    wss = new WebSocket.Server({
        port: Constants.WEBSOCKET_PORT,
    });

    app = express();
    const httpServer = http.createServer(app);

    httpServer.listen(Constants.EXPRESS_PORT, () => {
        console.log(`URL: http://localhost:${Constants.EXPRESS_PORT}`);
    });

    app.use( express.static(path.join(__dirname, '../client')));
}


export { startServer, app, wss };