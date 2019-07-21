import WebSocket from "ws";
import moment from "moment";
import { startServer, wss } from "./core/connections";
import { Constants } from "./core/Constants";
import Browser from "./core/Browser";

startServer();

moment.locale('ru');

let browser = null;
let authPromise = null;
let authPromiseRes = null;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const sendWS = (str, type = "log", obj = {}) => {
    wss.clients.forEach(_ws => {
        if (_ws.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({type: type, data: str, obj: obj}));
        }
    });
}

const log = (str, type = "INFO ", obj = null) => {
    const now = moment().format('kk:mm:ss.SSS');
    str = (type === "PURE") ? str : `${now}/time/ &nbsp${type}&nbsp/type/${str}`;
    
    if (type === "ERROR" && obj) {
        console.error(obj);
    }
    
    sendWS(str, "log", obj);
}

const authorize = async () => {
    sendWS("", "auth", {
        path: "./captcha.png",
    });

    authPromise = new Promise(res => authPromiseRes = res);
    return await authPromise;
}



const handleNewRequest = async (msg) => {
    log("<br><br><br>", "PURE");
    log("<strong>----- НОВЫЙ ЗАПРОС -----</strong>");

    if (!browser) {
        const browserSettings = Constants.browser;
        browserSettings.headless = process.argv.includes("head") ? false : true;
        browserSettings.debug = process.argv.includes("debug");

        browser = new Browser(browserSettings, log);
        await browser.createBrowser();
        browser.authorize = authorize;
    }

    try {
        if (!browser.page || browser.page.status === "closed") {
            await browser.createPage();
        } else {
            return log("Дождитесь выполнения предыдущего запроса", "WARN ");
        }

        const url = msg.obj.url;

        await browser.handleRequest(url);
    } catch (err) {
        log(err.message, "ERROR", err);
    }

    if (browser.page && browser.page.status === "openned") {
        await browser.page.close();
        log("Вкладка закрыта");
    }

    log("Запрос обработан. Ожидание дальнейших действий...");
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
            
            case "newRequest":
            handleNewRequest(msg);
            break;

            case "auth":
            authPromiseRes(msg.obj);
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