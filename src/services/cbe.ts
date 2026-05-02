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
    // CBE receipt URL usually expects an 8-digit suffix. 
    // If the full 13-digit account number is provided, we extract the last 8.
    const suffix = accountSuffix.length > 8 ? accountSuffix.slice(-8) : accountSuffix;
    const fullId = `${reference}${suffix}`;
    // Reverting to port :100 as per CBE requirement (removal caused timeout)
    const url = `https://apps.cbe.com.et:100/?id=${fullId}`;



    logger.info(`Attempting CBE fetch: ${url}`);
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
            timeout: 60000
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
                const contentType = response.headers()['content-type']?.toLowerCase() || '';
                const currentUrl = response.url().toLowerCase();
                const status = response.status();
                
                logger.info(`🌐 Intercepted: [${status}] ${response.url()} (type: ${contentType})`);
                
                if (contentType.includes('pdf') || currentUrl.endsWith('.pdf') || (contentType.includes('octet-stream') && currentUrl.includes('id='))) {
                    logger.info(`✅ Found PDF link: ${response.url()}`);
                    detectedPdfUrl = response.url();
                }
            });

            logger.info(`Navigating to CBE URL: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            logger.info(`Page reached, watching background traffic for 15 seconds...`);
            let waitTicks = 0;
            while (!detectedPdfUrl && waitTicks < 30) { // wait up to 15 seconds (30 * 500ms)
                await new Promise(res => setTimeout(res, 500));
                waitTicks++;
            }
            
            if (!detectedPdfUrl) {
                // Check if the page itself has anything useful
                const pageContent = await page.content();
                logger.warn(`PDF not detected in traffic. Page content length: ${pageContent.length}`);
                if (pageContent.includes('iframe src="') || pageContent.includes('embed src="')) {
                  logger.info("Found PDF embed/iframe in HTML. Attempting extraction...");
                  // Add logic to extract from HTML if needed
                }
            }

            await browser.close();
            browser = null;

            if (!detectedPdfUrl) {
                logger.error(`❌ CBE: No PDF link caught. Site might be down, slow, or URL incorrect: ${url}`);
                return { success: false, error: 'CBE: No PDF detected' };
            }

            logger.info(`Downloading PDF: ${detectedPdfUrl}`);
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
        const receiverName = rawText.match(/Receiver\s*:?\s*(.*?)\s+Account/i)?.[1]?.trim();

        // Match Account numbers (may be masked like 1****2704)
        const accounts = rawText.match(/Account\s*:?\s*([\d\*x\-]+)/gi);
        const payerAccount = accounts?.[0]?.replace(/Account\s*:?\s*/i, '').trim();
        const receiverAccount = accounts?.[1]?.replace(/Account\s*:?\s*/i, '').trim();

        const amountText = rawText.match(/Transferred Amount\s*:?\s*([\d,]+\.\d{2})\s*ETB/i)?.[1];
        const reference = rawText.match(/Reference No\.?\s*\(VAT Invoice No\)\s*:?\s*([A-Z0-9]+)/i)?.[1]?.trim();

        return {
            success: true,
            payer: payerName,
            payerAccount: payerAccount,
            receiver: receiverName,
            receiverAccount: receiverAccount,
            amount: amountText ? parseFloat(amountText.replace(/,/g, '')) : 0,
            reference: reference
        };
    } catch (e: any) {
        return { success: false, error: `Parse error: ${e.message}` };
    }
}
