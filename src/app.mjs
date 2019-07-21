import WebSocket from "ws";
import moment from "moment";
import { startServer, wss } from "./core/Connections";

startServer();

moment.locale('ru');

const sendWS = (str, type = "log") => {
    wss.clients.forEach(_ws => {
        if (_ws.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({type: type, data: str}));
        }
    });
}

const log = (str, type = "INFO") => {
    const now = moment().format('kk:mm:ss.SSS');
    str = `${now}/time/ ${type} /type/${str}`;
    sendWS(str);
}

wss.on("connection", ws => {

    ws.on("message", data => {

        let msg;
        try {
            msg = JSON.parse(data);
        } catch (err) {
            console.log(`Can't parse message: ${err.message}`);
            return console.log(data);
        }

        if (!msg.type) {
            return console.log(`WS Server: Unknown message - ${msg}`);
        }

        switch (msg.type) {

            case "log":
                log(msg.data);
                break;

            default:
                break;
        }

    });

});

wss.on("error", err => {
    console.log(`WS Server: ERROR`);
    console.log(err);
});

wss.on("close", () => {
    console.log(`WS Server: closed`);
});