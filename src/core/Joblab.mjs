export default class Joblab {

    constructor(browser, page, url, log) {
        this.browser = browser;
        this.page = page;
        this.url = url;
        this.log = log;
    }

    async click(options = {}) {

        let {
            sel = ".className",
            clickOptions = {
                clickCount: 1,
                delay: 40,
            },
            clickInEval = false,
            delayBefore = 0,
            delayAfter = 0,
            logMsg = "",
            errMsg = "Ошибка",
            type = null, // string: "textToType" || object: {sel: ".selector", text: "textToType"}
            delayAfterType = 0,
        } = options;

        if (delayBefore > 0) {
            await this.page.waitFor(delayBefore);
        }

        if (logMsg.length) {
            this.log(logMsg);
        }

        const element = await this.page.$(sel);
        if (!element) {
            return this.log(errMsg, "ERROR");
        }

        if (clickInEval) {
            await this.page.evaluate(sel => document.querySelector(sel).click(), sel);
        } else {
            await element.click(clickOptions);
        }

        if (delayAfter > 0) {
            await this.page.waitFor(delayAfter);
        }

        if (type !== null) {

            if (typeof type === "string") {
                await element.type(type, {
                    delay: 20,
                });
            }

            if (typeof type === "object") {
                // TODO
            }

        }

        if (delayAfterType > 0) {
            await this.page.waitFor(delayAfterType);
        }
    }

    async goto(url = this.url, page = this.page) {
        this.log(`Открываем страницу: ${url}`);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
        });
        await page.waitFor(2000);

        this.log("Страница открыта");
    }

    async checkPage() {
        this.log(`Проверяем необходимость авторизации`);

        const loginButton = await this.page.$$eval("ul.menu li", 
            els => els.find(el => el.textContent === "Войти"));

        if (loginButton) {
            this.log(`Необходима авторизация`);
            return true;
        }

        this.log(`Авторизация не требуется`);
        return false;
    }

    async login(authAttempts = 1) {

        await this.goto("https://joblab.ru/access.php");

        const antispamImg = await this.page.$("#antispam");

        const captchaPath = `captcha/${Date.now()}-captcha.png`;

        await antispamImg.screenshot({
            path: `./src/client/${captchaPath}`,
        });

        this.log(`Ожидание авторизации...`, "WARN ");

        const authObj = await this.browser.authorize(captchaPath);

        this.log(`Данные авторизации получены`);


        this.log(`Указываем Email`);
        await this.page.$eval(
            "form[name*='loginFormAll'] input[name*='email']",
            (el, authObj) => (el.value = authObj.email),
            authObj
        );
        await this.page.waitFor(200);


        this.log(`Указываем пароль`);
        await this.page.$eval(
            "form[name*='loginFormAll'] input[name*='pass']",
            (el, authObj) => (el.value = authObj.password),
            authObj
        );
        await this.page.waitFor(200);


        this.log(`Указываем код`);
        await this.page.$eval(
            "form[name*='loginFormAll'] input[name*='keystring']",
            (el, authObj) => (el.value = authObj.antispam),
            authObj
        );
        await this.page.waitFor(200);


        this.log(`Выбираем тип поиска`);
        const radioValue = (authObj.radioValue === 1) ? "jobseeker" : "employer";
        await this.page.$eval(`form[name*='loginFormAll'] input[value*='${radioValue}']`, 
            el => el.checked = true);


        await this.click({
            sel: "#submit_auth",
            delayAfter: 100,
            logMsg: "Нажимаем на кнопку отправки формы аутентификации",
            errMsg: "Кнопка отправки формы аутентификации не найдена",
        });

        const authResult = await this.page.waitForFunction(() => {
            const els = document.querySelectorAll("ul.menu li");
            if (!Array.from(els).find(el => el.textContent === "Войти")) {
                return {
                    type: "success",
                };
            }

            if (document.querySelector(".error")) {
                return {
                    type: "error",
                    msg: document.querySelector(".error").textContent,
                };
            }
        });

        const authResultJSON = await authResult.jsonValue();

        if (authResultJSON.type === "success") {
            this.log("<strong>Авторизация успешна</strong>");
            return await this.page.waitFor(1000);
        }

        if (authResultJSON.type === "error") {
            this.log(`Ошибка авторизации: ${authResultJSON.msg}`, "ERROR");

            if (authAttempts > 10) {
                throw new Error(`Количество попыток авторизации превышено`);
            }

            return await this.login(++authAttempts);
        }
    }

    async parsePage() {

        const items = await this.page.$$eval(".prof>a", 
            (els) => {
                const items = [];
                Array.from(els).forEach(el => items.push(el.href));
                return items;
            });

        if (this.items.length < 200) {
            this.items = this.items.concat(items);
        }

        this.log(`Всего анкет: ${this.items.length}`);

        await this.page.waitFor(500);
    }

    async parsePages() {

        this.items = [];

        for (const page of this.pages) {
            await this.goto(page);
            await this.parsePage();
        }

        this.log(`Все анкеты собраны`);
    }

    async parseItem(worker) {
        if (!this.items.length) {
            if (!this.workers.find(el => el.status === "work")) {
                this.parsingPromiseRes();
            }
            return;
        }

        worker.status = "work";
        const url = this.items.shift();
        await this.goto(url, worker);

        if (await worker.$("form[name*=check_user] img")) {
            this.log("На странице обнаружена капча", "WARN ");

            const antispamImg = await worker.$("form[name*=check_user] img");

            const captchaPath = `captcha/${Date.now()}-captcha.png`;

            await antispamImg.screenshot({
                path: `./src/client/${captchaPath}`,
            });

            this.log(`Ожидание ввода капчи...`);

            const anticaptchaObj = await this.browser.anticaptcha(captchaPath, worker.id);

            if (anticaptchaObj && anticaptchaObj.workerId === worker.id) {

                await worker.$eval(
                    "form[name*=check_user] input[name*=keystring]",
                    (el, anticaptchaObj) => (el.value = anticaptchaObj.anticaptcha),
                    anticaptchaObj
                );
                await worker.waitFor(200);

                const submitCaptcha = await worker.$(
                    "form[name*=check_user] input[name*=submit_captcha]"
                );
                await submitCaptcha.click({
                    clickCount: 1,
                    delay: 40,
                });
                
            } else {

                await worker.waitFor(2000);
                await worker.reload({
                    waitUntil: "domcontentloaded",
                });
            }

            await worker.waitFor(3000);

            if (await worker.$("form[name*=check_user] img")) {
                this.log(`Капчу не удалось отгадать`, "WARN ");
                await worker.waitFor(1000);
                worker.status = "ready";
                return await this.parseItem(worker);
            }

            this.log(`Капча пройдена!`);
        }

        const phoneLink = await worker.$("#p a");
        if (phoneLink) {
            this.log("Нажимаем на кнопку 'Показать телефон'");
            await phoneLink.click({
                clickCount: 1,
                delay: 40,
            });
            await worker.waitFor(500);
        }

        const item = await worker.evaluate((url) => {
            if (!document.querySelector(".table-to-div")) {
                return;
            }

            const table = document.querySelector(".table-to-div").tBodies[0];
            if (!table) {
                return;
            }

            const item = {
                "Название": document.querySelector(".contentmain h1").textContent.trim(),
                "Ссылка": url,
            };

            const _item = {
                main: [],
                exp: [],
                education: [],
                extra: [],
            };

            let _obj = _item.main;

            Array.from(table.rows).forEach(row => {
                if (row.className.includes("no_print")) {
                    return;
                }

                if (row.textContent.trim() === "Опыт работы") {
                    _obj = _item.exp;
                }
                if (row.textContent.trim() === "Образование") {
                    _obj = _item.education;
                }
                if (row.textContent.trim() === "Дополнительная информация") {
                    _obj = _item.extra;
                }

                if (row.cells.length !== 2) {
                    return;
                }

                _obj.push({
                    title: row.cells[0].textContent.trim(),
                    value: row.cells[1].textContent.trim(),
                });
            });

            _item.main.forEach(el => {
                item[el.title] = el.value;
            });
            _item.education.forEach(el => {
                item[el.title] = el.value;
            });
            _item.extra.forEach(el => {
                item[el.title] = el.value;
            });

            return item;
        }, url);

        this.parsedItems.push(item);

        this.log(`Анкета обработана: ${url}<br>Осталось: ${this.items.length}`);

        worker.status = "ready";
        await this.parseItem(worker);
    }

    async setWorkers(totalWorkers) {
        if (!this.items.length) {
            return this.log(`Количество анкет: 0`, "ERROR");
        }

        for (let i = 0; i < totalWorkers; i++) {
            const page = await this.browser.browserObj.newPage();
            page.status = "ready";
            page.id = i;
            this.workers.push(page);
        }

        this.parsingPromise = new Promise((res, rej) => {
            this.parsingPromiseRes = res;
            this.parsingPromiseRej = rej;
        });

        this.workers.forEach(worker => this.parseItem(worker));
    }

}