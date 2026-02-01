import axios from 'axios';
import logger from '../utils/logger';

export interface ImageVerifyResult {
    success: boolean;
    detectedType?: string;
    amount?: string;
    payerName?: string;
    receiverName?: string;
    transactionDate?: string;
    referenceNumber?: string;
    status?: string;
    suffix?: string;
    error?: string;
}

export async function verifyImage(imageData: string, suffix?: string): Promise<ImageVerifyResult> {
    try {
        const mistralKey = process.env.MISTRAL_API_KEY;
        if (!mistralKey) {
            return { success: false, error: 'Mistral API key not configured' };
        }

        logger.info('Analyzing receipt image with Mistral AI');

        const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
                model: 'mistral-small-latest',
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this payment receipt image and extract the following information if visible:
1. Receipt type (CBE, Telebirr, Dashen, Abyssinia, CBE Birr)
2. Amount
3. Payer name
4. Receiver name
5. Transaction date
6. Reference/Receipt number
7. Transaction status

Respond in JSON format.`,
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${mistralKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const content = response.data.choices[0].message.content;
        const extractedData = JSON.parse(content);

        return {
            success: true,
            detectedType: extractedData.receiptType || 'unknown',
            amount: extractedData.amount,
            payerName: extractedData.payerName,
            receiverName: extractedData.receiverName,
            transactionDate: extractedData.transactionDate,
            referenceNumber: extractedData.referenceNumber,
            status: extractedData.status,
            suffix,
        };
    } catch (error: any) {
        logger.error('Image verification failed:', error.message);
        return { success: false, error: error.message };
    }
}
