

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
            logMsg = "Инфо",
            errMsg = "Ошибка",
            type = null, // string: "textToType" || object: {sel: ".selector", text: "textToType"}
            delayAfterType = 0,
        } = options;

        if (delayBefore > 0) {
            await this.page.waitFor(delayBefore);
        }

        this.log(logMsg);

        const element = await this.page.$(sel);
        if (!element) {
            throw new Error(errMsg);
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

    async goto(url = this.url) {
        this.log(`Открываем страницу: ${url}`);

        await this.page.goto(url, {
            waitUntil: "domcontentloaded",
        });
        await this.page.waitFor(2000);

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
            this.log("Авторизация успешна");
            return await this.page.waitFor(1000);
        }

        if (authResultJSON.type === "error") {
            this.log(`Ошибка авторизации: ${authResultJSON.msg}`, "ERROR");

            if (authAttempts > 10) {
                return this.log(`Количество попыток авторизации превышено`, "ERROR");
            }

            return await this.login(++authAttempts);
        }
    }

}