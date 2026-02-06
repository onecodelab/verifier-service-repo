import axios from "axios";
import { load } from "cheerio";
import { logger } from "../logger";

export async function verifyCBEBirr(
  receiptNumber: string,
  phoneNumber: string
) {
  try {
    const phoneRegex = /^251\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error(
        "Invalid Ethiopian phone number format (must be 251 + 9 digits)"
      );
    }

    const url = `https://cbebirr.et/receipt/${receiptNumber}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = load(response.data);
    const payerName = $('td:contains("Payer")').next().text().trim();
    const receiverName = $('td:contains("Receiver")').next().text().trim();
    const amount = $('td:contains("Amount")').next().text().trim();
    const fees = $('td:contains("Fees")').next().text().trim();
    const status = $('td:contains("Status")').next().text().trim();
    const date = $('td:contains("Date")').next().text().trim();

    if (!payerName || !amount) {
      throw new Error("Invalid CBE Birr receipt");
    }

    return {
      success: true,
      payerName,
      phoneNumber,
      receiverName,
      amount,
      fees,
      status,
      date,
      receiptNumber,
    };
  } catch (error: any) {
    logger.error("CBE Birr verification failed:", error.message);
    throw error;
  }
}

export default verifyCBEBirr;
