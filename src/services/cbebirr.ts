import axios from 'axios';
import logger from '../utils/logger';

export interface CBEBirrVerifyResult {
    success: boolean;
    receiptNumber?: string;
    payer?: string;
    receiver?: string;
    receiverAccount?: string;
    amount?: string;
    fees?: string;
    status?: string;
    timestamp?: string;
    error?: string;
}

export async function verifyCBEBirr(receiptNumber: string, phoneNumber: string): Promise<CBEBirrVerifyResult> {
    try {
        // Validate Ethiopian phone number format
        if (!/^251\d{9}$/.test(phoneNumber)) {
            return { success: false, error: 'Phone number must be in 251XXXXXXXXX format' };
        }

        // CBE Birr verification endpoint (placeholder - actual URL may vary)
        const url = `https://cbebirr.cbe.com.et/verify`;
        logger.info(`Verifying CBE Birr receipt: ${receiptNumber}`);

        const response = await axios.post(url, {
            receiptNumber,
            phoneNumber
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        const data = response.data;

        if (data && data.success) {
            return {
                success: true,
                receiptNumber: data.receiptNumber,
                payer: data.payer,
                receiver: data.receiver,
                receiverAccount: data.receiverAccount,
                amount: data.amount,
                fees: data.fees,
                status: data.status,
                timestamp: data.timestamp
            };
        }

        return { success: false, error: 'Receipt not found' };
    } catch (error: any) {
        logger.error('CBE Birr verification failed:', error.message);
        return { success: false, error: error.message };
    }
}
