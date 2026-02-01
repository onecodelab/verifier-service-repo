const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

function extractSettledAmountRegex(htmlContent) {
    const pattern = /የተከፈለው\s+መጠን\/Settled\s+Amount.*?<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d{2})?\s+Birr)/is;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractReceiptNoRegex(htmlContent) {
    const pattern = /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractDateRegex(htmlContent) {
    const pattern = /(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractWithRegex(htmlContent, labelPattern) {
    const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedLabel}.*?<\\/td>\\s*<td[^>]*>\\s*([^<]+)`, 'is');
    const match = htmlContent.match(pattern);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : null;
}

function scrapeTelebirrReceipt(html) {
    const getText = (label) => {
        return extractWithRegex(html, label) || "";
    };

    return {
        payerName: getText("የከፋይ ስም/Payer Name"),
        payerTelebirrNo: getText("የከፋይ ቴሌብር ቁ./Payer telebirr no."),
        creditedPartyName: getText("የገንዘብ ተቀባይ ስም/Credited Party name"),
        creditedPartyAccountNo: getText("የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no"),
        transactionStatus: getText("የክፍያው ሁኔታ/transaction status"),
        receiptNo: extractReceiptNoRegex(html) || "",
        paymentDate: extractDateRegex(html) || "",
        settledAmount: extractSettledAmountRegex(html) || "",
        serviceFee: extractWithRegex(html, "የአገልግሎት ክፍያ/Service fee") || "",
        serviceFeeVAT: extractWithRegex(html, "የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT") || "",
        totalPaidAmount: extractWithRegex(html, "ጠቅላላ የተከፈለ/Total Paid Amount") || "",
    };
}

(async () => {
    const reference = 'FT2602760RM716408do';
    const url = `https://transactioninfo.ethiotelecom.et/receipt/${reference}`;
    console.log(`Fetching: ${url}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const content = await page.content();
        const data = scrapeTelebirrReceipt(content);

        console.log("EXTRACTED_DATA_START");
        console.log(JSON.stringify(data, null, 2));
        console.log("EXTRACTED_DATA_END");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        if (browser) await browser.close();
    }
})();
