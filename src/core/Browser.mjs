import puppeteer from "puppeteer";
import Joblab from "./Joblab";

export default class Browser {
    
    constructor(browserSettings, log) {
        this.browserSettings = browserSettings;
        this.log = log;
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
            await this.joblab.login(url);
        }
        
        
        
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
