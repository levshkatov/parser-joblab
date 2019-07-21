

export default class Joblab {

    constructor(browser, page, url, log) {
        this.browser = browser;
        this.page = page;
        this.url = url;
        this.log = log;
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

    async login(url) {

        await this.goto("https://joblab.ru/access.php");

        const antispamImg = await this.page.$("#antispam");

        await antispamImg.screenshot({
            path: `./src/client/captcha.png`,
        });

        this.log(`Ожидание авторизации...`);

        const authObj = await this.browser.authorize();

        this.log(authObj.email);

        await this.page.waitFor(2000);

        // await this.click({
        //     sel: 'button[class*="auth-panel"]',
        //     delayAfter: 100,
        //     logMsg: "Нажимаем на кнопку Вход на сайт",
        //     errMsg: "Кнопка Вход на сайт не найдена",
        // });

        // await this.page.waitForFunction(() => document.querySelector('input[name="login"]'));

        // const usernameSel = 'input[name="login"]';
        // const passwordSel = 'input[name="password"]';

        // await this.click({
        //     sel: usernameSel,
        //     delayAfter: 100,
        //     logMsg: "Указываем логин",
        //     errMsg: "usernameField не найден",
        //     type: this.settings.login,
        //     delayAfterType: 300,
        // });

        // await this.click({
        //     sel: passwordSel,
        //     delayAfter: 100,
        //     logMsg: "Указываем пароль",
        //     errMsg: "passwordField не найден",
        //     type: this.settings.password,
        //     delayAfterType: 300,
        // });

        // await this.click({
        //     sel: 'button[class*="auth-form__submit"]',
        //     delayAfter: 100,
        //     logMsg: "Нажимаем на кнопку отправки формы аутентификации",
        //     errMsg: "Кнопка отправки формы аутентификации не найдена",
        // });


        // await this.page.waitForSelector('[class*="auth-panel_signed"]');

        // await this.page.waitForFunction(() => document.querySelector('input[name="login"]') === null);

        // this.logger.info("Аутентификация успешна");
        
        // let pathname = await this.page.evaluate(() => location.pathname);

        // if (!url.includes(pathname) && !url.includes(decodeURIComponent(pathname))) {

        //     this.logger.info("Произошел редирект. Повторное открытие страницы");

        //     await this.gotoUrl(url);

        //     pathname = await this.page.evaluate(() => location.pathname);
        //     const _url = await this.page.evaluate(() => location.href);

        //     if (!url.includes(pathname) && !url.includes(decodeURIComponent(pathname))) {
        //         throw new Error(`Не получается повторно открыть необходимый url. `+
        //             `Текущий: "${_url}"`);
        //     }

        //     return;
        // }

        // await this.page.waitFor(3000);
    }

}