import puppeteer from 'puppeteer';
import logger from '../utils/logger';

export interface AbyssiniaVerifyResult {
    success: boolean;
    transactionReference?: string;
    payer?: string;
    payerAccount?: string;
    receiver?: string;
    receiverAccount?: string;
    amount?: string;
    date?: string;
    status?: string;
    reason?: string;
    error?: string;
}

export async function verifyAbyssinia(reference: string, suffix: string): Promise<AbyssiniaVerifyResult> {
    if (suffix.length !== 5) {
        return { success: false, error: 'Suffix must be exactly 5 digits' };
    }

    // New URL format: cs.bankofabyssinia.com with trx query param
    // The full ID appears to be reference + suffix (based on user's screenshot)
    const fullTrxId = `${reference}${suffix}`;
    const url = `https://cs.bankofabyssinia.com/slip/?trx=${fullTrxId}`;

    let browser;
    try {
        logger.info(`Attempting to fetch Abyssinia receipt via Puppeteer: ${url}`);

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for the SPA to render content
        await new Promise(r => setTimeout(r, 3000));

        // Extract data from the page
        const data = await page.evaluate(() => {
            const getText = (label: string): string => {
                const elements = document.querySelectorAll('td, div, span, p');
                for (const el of elements) {
                    if (el.textContent?.toLowerCase().includes(label.toLowerCase())) {
                        const next = el.nextElementSibling;
                        if (next) return next.textContent?.trim() || '';
                    }
                }
                return '';
            };

            return {
                payer: getText('payer') || getText('sender'),
                payerAccount: getText('payerAccount') || getText('account'),
                receiver: getText('receiver') || getText('beneficiary'),
                receiverAccount: getText('receiverAccount') || getText('beneficiaryAccount'),
                amount: getText('amount'),
                date: getText('date'),
                status: getText('status') || getText('success'),
                reason: getText('reason') || getText('description'),
                reference: getText('reference')
            };
        });

        await browser.close();
        browser = null;

        if (data.payer || data.amount) {
            return {
                success: true,
                transactionReference: reference,
                ...data
            };
        }

        logger.warn(`Abyssinia scrape finished but data incomplete for ${reference}`);
        return { success: false, error: 'Could not extract transaction data' };

    } catch (error: any) {
        logger.error(`Error fetching Abyssinia receipt: ${error.message}`);
        if (browser) await browser.close();
        return { success: false, error: error.message };
    }
}
