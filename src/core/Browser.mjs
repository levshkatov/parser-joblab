import puppeteer from "puppeteer";
import Joblab from "./Joblab";
import csvConverter from "json-2-csv";
import { promisify } from "util";
import fs from "fs";

// const stringify = promisify(csvStringify);
const json2csv = promisify(csvConverter.json2csv);
const writeFile = promisify(fs.writeFile);

export default class Browser {
    
    constructor(browserSettings, log, sendWS) {
        this.browserSettings = browserSettings;
        this.log = log;
        this.sendWS = sendWS;
    }
    
    async createBrowser() {
        const {
            useragent,
            language,
            window,
            proxy,
            userDataDir,
            headless,
            debug,
        } = this.browserSettings;
        
        const args = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--start-maximized",
            "--disable-background-networking",
            "--disable-gpu",
        ];
        
        if (window) {
            args.push(`--window-size=${window.width},${window.height}`);
        }
        
        if (useragent) {
            args.push(`--user-agent=${useragent}`);
        }
        
        if (language) {
            args.push(`--lang=${language}`);
        }
        
        if (proxy) {
            args.push(`--proxy-server=${proxy}`);
        }
        
        let options = {
            args: args,
            userDataDir: userDataDir,
        };
        
        options.headless = headless;
        
        if (debug) {
            options.devtools = true;
            // options.slowMo = 200;
        }
        
        this.log("Открываем браузер...");
        
        const browserObj = await puppeteer.launch(options);
        
        browserObj.on("disconnected", async () => {
            this.log("Браузер закрыт", "ERROR");
            this.log("Попытка перезапустить браузер");
            await this.createBrowser();
        });
        
        this.browserObj = browserObj;
        
        const extraLogStr = this.browserSettings.debug
        ? " в режиме отладки"
        : !this.browserSettings.headless
        ? " в оконном режиме"
        : "";
        
        this.log(`Браузер запущен${extraLogStr}`);
    }
    
    async createPage(secondTab = false) {
        const page = secondTab ? (await this.browserObj.pages())[0] : await this.browserObj.newPage();
        
        await page._client.send("Emulation.clearDeviceMetricsOverride");
        
        await page.setExtraHTTPHeaders(this.browserSettings.headers);
        
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "languages", {
                get: function() {
                    return this.browserSettings.languages;
                },
            });
            
            Object.defineProperty(navigator, "platform", {
                get: function() {
                    return this.browserSettings.platform;
                },
            });
        });
        
        this.page = page;
        this.page.status = "openned";

        this.page.on("close", () => this.page.status = "closed");
        
        this.log("Вкладка создана");
    }
    
    async handleRequest(url) {
        
        this.joblab = new Joblab(this, this.page, url, this.log);
        
        await this.joblab.goto(url);

        if (await this.joblab.checkPage()) {
            await this.joblab.login();
            await this.joblab.goto(url);
        }
        
        const totalItems = await this.page.$eval("td.td-to-div h1", el => parseInt(el.textContent.split("(")[1]));
        const typeOfItems = await this.page.$eval("td.td-to-div h1", el => (el.textContent.includes("резюме")) ? "Количество резюме:" : "Количество вакансий:");

        this.log(`${typeOfItems} ${totalItems}`);

        const totalPages = (await this.page.$(".pager")) 
            ? await this.page.evaluate(() => parseInt(document.querySelectorAll(".pager")[document.querySelectorAll(".pager").length-1].textContent)) 
            : 1;

        this.log(`Количество страниц: ${totalPages}`);

        this.joblab.pages = [];

        for (let i = 1; i <= totalPages; i++) {
            this.joblab.pages.push(`${url}&page=${i}`);
        }

        this.log(`Собираем ссылки на анкеты`);
        await this.joblab.parsePages();

        const totalWorkers = (process.argv.includes("head")) ? 1 : 5;
        this.joblab.workers = [];
        this.joblab.parsedItems = [];
        this.log(`Начинаем парсить анкеты в ${totalWorkers} поток${totalWorkers===1 ? "" : "ов"}`);
        await this.joblab.setWorkers(totalWorkers);

        await this.joblab.parsingPromise;

        this.log(`Парсинг завершен`, "WARN ");
        this.log(`<strong>Всего анкет: ${this.joblab.parsedItems.length}</strong>`);

        this.joblab.workers.forEach(async worker => await worker.close());

        const output = (await json2csv(this.joblab.parsedItems)).replace(/undefined/g, '');
        await writeFile("./output/output.csv", output, "utf8");
        await writeFile("./src/client/output.csv", output, "utf8");

        this.log(`Файл записан: ./output/output.csv`);

        this.sendWS("", "output", {
            path: `./output.csv`,
        });
    }
    
}


// const saveScreenshot = async (page, type = "ok") => {
//     const timestamp = Date.now();

//     const filename = `${timestamp}-${type}.png`;

//     await page.screenshot({
//         path: `./screenshots/${filename}`,
//         fullPage: true,
//     });

//     await page._client.send("Emulation.clearDeviceMetricsOverride");

//     return filename;
// };
