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

        logger.info(`Navigating to Abyssinia receipt...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        logger.info(`Page loaded, waiting for dynamic content...`);

        // Wait for the SPA to render content
        await new Promise(r => setTimeout(r, 6000));
        
        const pageContent = await page.content();
        logger.info(`Page HTML length: ${pageContent.length} bytes`);

        // Helper for regex extraction
        const extractWithRegex = (htmlContent: string, labelPattern: string): string | undefined => {
            const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // The FIX: added 's' flag here (dotAll)
            const pattern = new RegExp(`${escapedLabel}.*?\\/td>\\s*<td[^>]*>\\s*([^<]+)`, 'is');
            const match = htmlContent.match(pattern);
            return match ? match[1].replace(/<[^>]*>/g, '').trim() : undefined;
        };

        // Extract data from the page using evaluate OR regex fallback
        const data = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const bodyHtml = document.body.innerHTML;

            const getText = (label: string): string => {
                const elements = Array.from(document.querySelectorAll('td, div, span, p, label, b, strong'));
                for (const el of elements) {
                    const text = el.textContent?.trim().toLowerCase() || '';
                    if (text === label.toLowerCase() || text.startsWith(label.toLowerCase() + ':')) {
                        let val = el.nextElementSibling?.textContent?.trim();
                        if (!val) {
                            // Check parent's next sibling (common in tables)
                            val = el.parentElement?.nextElementSibling?.textContent?.trim();
                        }
                        if (val) return val;
                    }
                }
                return '';
            };

            // Aggressive amount search (look for numbers followed by ETB/Birr or preceded by specific words)
            const findAmountRobust = (): string => {
                const labelMatch = getText('amount') || getText('sum') || getText('total') || getText('quantity');
                if (labelMatch) return labelMatch;

                // Regex: find numbers that look like money (e.g. 440.00, 1,200)
                const moneyRegex = /(?:amount|sum|total|price|etb|birr)[\s:]*([\d,]+\.?\d*)/i;
                const match = bodyText.match(moneyRegex);
                if (match) return match[1];

                // Last resort: find any large number near the word "ETB"
                const etbMatch = bodyText.match(/([\d,]+\.?\d*)\s*(?:ETB|Birr|ብር)/i);
                return etbMatch ? etbMatch[1] : '';
            };

            // Aggressive reference search
            const findRefRobust = (): string => {
                const labelMatch = getText('reference') || getText('trx id') || getText('transaction id') || getText('ref');
                if (labelMatch) return labelMatch;

                // Abyssinia refs usually start with FT or a number and are ~12 chars
                const refRegex = /(?:FT|TX|REF)[\d\w]{8,15}/i;
                const match = bodyText.match(refRegex);
                return match ? match[0] : '';
            };

            return {
                payer: getText('payer') || getText('sender') || getText('from'),
                payerAccount: getText('payerAccount') || getText('account') || getText('sender account'),
                receiver: getText('receiver') || getText('beneficiary') || getText('to'),
                receiverAccount: getText('receiverAccount') || getText('beneficiaryAccount') || getText('to account'),
                amount: findAmountRobust(),
                date: getText('date') || getText('time') || getText('transaction date'),
                status: getText('status') || getText('success') || getText('completed'),
                reason: getText('reason') || getText('description') || getText('remark'),
                reference: findRefRobust()
            };
        });

        await browser.close();
        browser = null;

        // Apply regex-based fallbacks on pageContent if evaluate missed things
        const finalData = {
            payer: data.payer || extractWithRegex(pageContent, "Payer") || extractWithRegex(pageContent, "Sender") || undefined,
            payerAccount: data.payerAccount || extractWithRegex(pageContent, "Payer Account") || extractWithRegex(pageContent, "Sender Account") || undefined,
            receiver: data.receiver || extractWithRegex(pageContent, "Beneficiary") || extractWithRegex(pageContent, "Receiver") || undefined,
            receiverAccount: data.receiverAccount || extractWithRegex(pageContent, "Beneficiary Account") || extractWithRegex(pageContent, "Receiver Account") || undefined,
            amount: data.amount || extractWithRegex(pageContent, "Amount") || extractWithRegex(pageContent, "Total Amount") || undefined,
            date: data.date || extractWithRegex(pageContent, "Date") || extractWithRegex(pageContent, "Transaction Date") || undefined,
            status: data.status || extractWithRegex(pageContent, "Status") || undefined,
            reason: data.reason || extractWithRegex(pageContent, "Description") || extractWithRegex(pageContent, "Remark") || undefined,
            reference: data.reference || extractWithRegex(pageContent, "Reference") || extractWithRegex(pageContent, "TRX ID") || undefined
        };

        if (finalData.payer || finalData.amount || finalData.reference) {
            return {
                success: true,
                transactionReference: reference,
                ...finalData
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
