import axios from 'axios';
import { load } from 'cheerio';
import logger from '../utils/logger';

export interface DashenVerifyResult {
    success: boolean;
    senderName?: string;
    senderAccountNumber?: string;
    receiverName?: string;
    receiverAccountNumber?: string; // ADDED
    transactionAmount?: string;
    serviceCharge?: string;
    total?: string;
    transactionDate?: string;
    transactionReference?: string;
    narrative?: string;
    error?: string;
}

export async function verifyDashen(reference: string): Promise<DashenVerifyResult> {
    try {
        const url = `https://banking.dashenbank.com/receipt/${reference}`;
        logger.info(`Fetching Dashen receipt: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 15000
        });

        const $ = load(response.data);
        const senderName = $('td:contains("Sender")').next().text().trim();
        const senderAccount = $('td:contains("Sender Account")').next().text().trim();
        const receiverName = $('td:contains("Receiver")').next().text().trim();
        const receiverAccount = $('td:contains("Receiver Account")').next().text().trim();
        const amount = $('td:contains("Amount")').next().text().trim();
        const serviceCharge = $('td:contains("Service Charge")').next().text().trim();
        const total = $('td:contains("Total")').next().text().trim();
        const transactionDate = $('td:contains("Date")').next().text().trim();
        const narrative = $('td:contains("Narrative")').next().text().trim();

        if (!senderName || !amount) {
            return { success: false, error: 'Invalid Dashen reference' };
        }

        return {
            success: true,
            senderName,
            senderAccountNumber: senderAccount,
            receiverName,
            receiverAccountNumber: receiverAccount, // ADDED
            transactionAmount: amount,
            serviceCharge,
            total,
            transactionDate,
            transactionReference: reference,
            narrative,
        };
    } catch (error: any) {
        logger.error('Dashen verification failed:', error.message);
        return { success: false, error: error.message };
    }
}
