const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Use a real user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const url = 'https://transactioninfo.ethiotelecom.et/receipt/CL70Q4Y9KC';

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const content = await page.content();
        console.log('--- HTML CONTENT START ---');
        console.log(content);
        console.log('--- HTML CONTENT END ---');

        // Save to file just in case
        fs.writeFileSync('telebirr_dump.html', content);

        await browser.close();
    } catch (e) {
        console.error("Puppeteer Error:", e);
    }
})();
