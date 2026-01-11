import axios from 'axios';
import { load } from 'cheerio';
import { logger } from '../utils/logger';

export async function verifyCBE(reference: string, accountSuffix: string) {
  try {
    const url = `https://www.cbebirr.et/receipt/${reference}/${accountSuffix}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = load(response.data);
    const payerName = $('td:contains("Payer Name")').next().text().trim();
    const payerAccount = $('td:contains("Payer Account")').next().text().trim();
    const receiverName = $('td:contains("Receiver Name")').next().text().trim();
    const receiverAccount = $('td:contains("Receiver Account")').next().text().trim();
    const amount = $('td:contains("Amount")').next().text().trim();
    const date = $('td:contains("Date")').next().text().trim();
    const description = $('td:contains("Description")').next().text().trim();

    if (!payerName || !amount) {
      throw new Error('Invalid CBE reference or account suffix');
    }

    return {
      success: true,
      payerName,
      payerAccount,
      receiverName,
      receiverAccount,
      amount,
      date,
      reference,
      description,
    };
  } catch (error: any) {
    logger.error('CBE verification failed:', error.message);
    throw error;
  }
}

export default verifyCBE;
