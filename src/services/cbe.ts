import puppeteer from 'puppeteer';
import axios from 'axios';
import pdf from 'pdf-parse';
import https from 'https';
import logger from '../utils/logger';

export interface CBEVerifyResult {
    success: boolean;
    payer?: string;
    payerAccount?: string;
    receiver?: string;
    receiverAccount?: string;
    amount?: number;
    date?: Date;
    reference?: string;
    error?: string;
}

export async function verifyCBE(reference: string, accountSuffix: string): Promise<CBEVerifyResult> {
    const fullId = `${reference}${accountSuffix}`;
    const url = `https://apps.cbe.com.et:100/?id=${fullId}`;
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    try {
        logger.info(`🔎 Attempting CBE fetch: ${url}`);
        const response = await axios.get(url, {
            httpsAgent,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/pdf'
            },
            timeout: 30000
        });

        return await parseCBEReceipt(response.data);
    } catch (err: any) {
        logger.warn('Direct fetch failed, trying Puppeteer fallback...');
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
            });
            const page = await browser.newPage();
            let detectedPdfUrl: string | null = null;

            page.on('response', (response) => {
                if (response.headers()['content-type']?.includes('pdf')) {
                    detectedPdfUrl = response.url();
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(res => setTimeout(res, 5000));
            await browser.close();

            if (!detectedPdfUrl) return { success: false, error: 'No PDF detected' };

            const pdfRes = await axios.get(detectedPdfUrl, { httpsAgent, responseType: 'arraybuffer' });
            return await parseCBEReceipt(pdfRes.data);
        } catch (pErr: any) {
            if (browser) await browser.close();
            return { success: false, error: pErr.message };
        }
    }
}

async function parseCBEReceipt(buffer: ArrayBuffer): Promise<CBEVerifyResult> {
    try {
        const parsed = await pdf(Buffer.from(buffer));
        const rawText = parsed.text.replace(/\s+/g, ' ').trim();

        const payerName = rawText.match(/Payer\s*:?\s*(.*?)\s+Account/i)?.[1]?.trim();
        const amountText = rawText.match(/Transferred Amount\s*:?\s*([\d,]+\.\d{2})\s*ETB/i)?.[1];
        const reference = rawText.match(/Reference No\.?\s*\(VAT Invoice No\)\s*:?\s*([A-Z0-9]+)/i)?.[1]?.trim();

        return {
            success: true,
            payer: payerName,
            amount: amountText ? parseFloat(amountText.replace(/,/g, '')) : 0,
            reference: reference
        };
    } catch (e: any) {
        return { success: false, error: `Parse error: ${e.message}` };
    }
}
