import axios, { AxiosError } from "axios";
import puppeteer from 'puppeteer';
import * as cheerio from "cheerio";
import logger from '../utils/logger';

export interface TelebirrReceipt {
    payerName: string;
    payerTelebirrNo: string;
    creditedPartyName: string;
    creditedPartyAccountNo: string;
    transactionStatus: string;
    receiptNo: string;
    paymentDate: string;
    settledAmount: string;
    serviceFee: string;
    serviceFeeVAT: string;
    totalPaidAmount: string;
    bankName: string;
}

function extractSettledAmountRegex(htmlContent: string): string | null {
    const pattern = /የተከፈለው\s+መጠን\/Settled\s+Amount.*?<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d{2})?\s+Birr)/is;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractReceiptNoRegex(htmlContent: string): string | null {
    const pattern = /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractDateRegex(htmlContent: string): string | null {
    const pattern = /(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractWithRegex(htmlContent: string, labelPattern: string): string | null {
    const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedLabel}.*?<\\/td>\\s*<td[^>]*>\\s*([^<]+)`, 'is');
    const match = htmlContent.match(pattern);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : null;
}

function scrapeTelebirrReceipt(html: string): TelebirrReceipt {
    const $ = cheerio.load(html);

    const getText = (label: string): string => {
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
        bankName: ""
    };
}

export async function verifyTelebirr(reference: string): Promise<TelebirrReceipt | null> {
    const url = `https://transactioninfo.ethiotelecom.et/receipt/${reference}`;
    let browser;
    try {
        logger.info(`Attempting to fetch Telebirr receipt via Puppeteer: ${url}`);

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Set a real user agent to avoid basic blocking
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for connection to settle
        await new Promise(r => setTimeout(r, 2000));

        const content = await page.content();
        await browser.close();
        browser = null;

        const data = scrapeTelebirrReceipt(content);
        if (data.receiptNo && data.payerName) return data;

        logger.warn(`Telebirr scrape finished but data incomplete for ${reference}`);
        return null;
    } catch (error: any) {
        logger.error(`Error fetching Telebirr receipt: ${error.message}`);
        if (browser) await browser.close();
        return null;
    }
}
