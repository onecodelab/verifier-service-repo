import { VerifierClient } from '@creofam/verifier';
import { logger } from '../utils/logger';

// The SDK interacts with the hosted Verifier API (e.g., verify.leul.et)
// This is more stable than local scrapers as it's maintained by the official creators.
const client = new VerifierClient({
  baseUrl: process.env.OFFICIAL_VERIFIER_URL || 'https://verify.leul.et',
  apiKey: process.env.OFFICIAL_VERIFIER_KEY || '' // User needs to provide this
});

export const verifyWithOfficialSDK = async (method: string, reference: string, options: any = {}) => {
  try {
    logger.info(`Attempting official verification for ${method}: ${reference}`);
    
    let result: any;
    switch (method) {
      case 'telebirr':
        result = await client.verifyTelebirr({ reference });
        break;
      case 'cbe':
        if (!options.accountSuffix) throw new Error('CBE requires accountSuffix');
        result = await client.verifyCBE({ reference, accountSuffix: options.accountSuffix });
        break;
      case 'abyssinia':
        if (!options.suffix) throw new Error('Abyssinia requires suffix');
        result = await client.verifyAbyssinia({ reference, suffix: options.suffix });
        break;
      case 'dashen':
        result = await client.verifyDashen({ reference });
        break;
      case 'cbebirr':
        result = await client.verifyCBEBirr({ reference });
        break;
      default:
        throw new Error(`Unsupported method for official SDK: ${method}`);
    }

    if (result.ok) {
      return {
        success: true,
        amount: result.data.amount,
        receipt_reference: result.data.reference,
        payer_name: result.data.payerName,
        receiver_name: result.data.receiverName,
        receiver_account: result.data.receiverAccount,
        transaction_date: result.data.txnDate,
        raw: result.raw
      };
    } else {
      logger.warn(`Official verification failed for ${method}: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    logger.error(`Official SDK Error [${method}]:`, error.message);
    return { success: false, error: error.message };
  }
};
