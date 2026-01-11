import axios from 'axios';
import { load } from 'cheerio';
import { logger } from '../utils/logger';

export async function verifyAbyssinia(reference: string, suffix: string) {
  try {
    if (suffix.length !== 5) {
      throw new Error('Suffix must be exactly 5 digits');
    }

    const url = `https://www.bankofabyssinia.com/receipt/${reference}/${suffix}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = load(response.data);
    const transactionRef = $('td:contains("Reference")').next().text().trim();
    const accountInfo = $('td:contains("Account")').next().text().trim();
    const amount = $('td:contains("Amount")').next().text().trim();
    const date = $('td:contains("Date")').next().text().trim();
    const status = $('td:contains("Status")').next().text().trim();

    if (!transactionRef || !amount) {
      throw new Error('Invalid Abyssinia reference or suffix');
    }

    return {
      success: true,
      transactionReference: transactionRef,
      accountInformation: accountInfo,
      amount,
      date,
      status,
      reference,
    };
  } catch (error: any) {
    logger.error('Abyssinia verification failed:', error.message);
    throw error;
  }
}

export default verifyAbyssinia;
