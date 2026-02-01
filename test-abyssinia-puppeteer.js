const puppeteer = require('puppeteer');

(async () => {
    const reference = 'FT25339CH41W';
    const suffix = '16408';
    const fullTrxId = `${reference}${suffix}`;
    const url = `https://cs.bankofabyssinia.com/slip/?trx=${fullTrxId}`;

    console.log(`Testing Abyssinia Puppeteer extraction...`);
    console.log(`URL: ${url}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Increased timeout to 60s
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for SPA to render
        await new Promise(r => setTimeout(r, 5000));

        // Get the page content for debugging
        const content = await page.content();
        console.log(`Page length: ${content.length} chars`);

        // Try to extract data
        const data = await page.evaluate(() => {
            const body = document.body.innerText;
            return {
                bodyText: body.substring(0, 2000),
                hasPayer: body.toLowerCase().includes('payer'),
                hasAmount: body.toLowerCase().includes('amount') || body.toLowerCase().includes('500'),
                hasSuccess: body.toLowerCase().includes('success')
            };
        });

        console.log('RESULT_START');
        console.log(JSON.stringify(data, null, 2));
        console.log('RESULT_END');

        await browser.close();
    } catch (error) {
        console.error('Error:', error.message);
        if (browser) await browser.close();
    }
})();
