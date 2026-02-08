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
                const elements = Array.from(document.querySelectorAll('td, div, span, p, label'));
                for (const el of elements) {
                    const text = el.textContent?.trim().toLowerCase() || '';
                    if (text === label.toLowerCase() || text.startsWith(label.toLowerCase() + ':')) {
                        // Check next sibling OR parent's next sibling (common in tables)
                        const val = el.nextElementSibling?.textContent?.trim() ||
                            el.parentElement?.nextElementSibling?.textContent?.trim();
                        if (val) return val;
                    }
                }
                return '';
            };

            // Fallback: Look for the amount pattern (digits with optional decimals/commas followed by ETB/Birr or preceded by Sum/Amt)
            const findAmountFallback = (): string => {
                const bodyText = document.body.innerText;
                const match = bodyText.match(/(?:amount|sum|total|quantity)[\s:]+([\d,]+\.?\d*)/i);
                return match ? match[1] : '';
            };

            const amount = getText('amount') || getText('sum') || getText('total') || findAmountFallback();

            return {
                payer: getText('payer') || getText('sender') || getText('from'),
                payerAccount: getText('payerAccount') || getText('account') || getText('sender account'),
                receiver: getText('receiver') || getText('beneficiary') || getText('to'),
                receiverAccount: getText('receiverAccount') || getText('beneficiaryAccount') || getText('to account'),
                amount: amount,
                date: getText('date') || getText('time'),
                status: getText('status') || getText('success') || getText('completed'),
                reason: getText('reason') || getText('description') || getText('remark'),
                reference: getText('reference') || getText('trx id') || getText('transaction id')
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
