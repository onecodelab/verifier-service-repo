import axios from "axios";
import { load } from "cheerio";
import { logger } from "../logger";

export async function verifyDashen(reference: string) {
  try {
    const url = `https://banking.dashenbank.com/receipt/${reference}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = load(response.data);
    const senderName = $('td:contains("Sender")').next().text().trim();
    const senderAccount = $('td:contains("Sender Account")')
      .next()
      .text()
      .trim();
    const receiverName = $('td:contains("Receiver")').next().text().trim();
    const amount = $('td:contains("Amount")').next().text().trim();
    const serviceCharge = $('td:contains("Service Charge")')
      .next()
      .text()
      .trim();
    const total = $('td:contains("Total")').next().text().trim();
    const transactionDate = $('td:contains("Date")').next().text().trim();
    const narrative = $('td:contains("Narrative")').next().text().trim();

    if (!senderName || !amount) {
      throw new Error("Invalid Dashen reference");
    }

    return {
      success: true,
      senderName,
      senderAccountNumber: senderAccount,
      receiverName,
      transactionAmount: amount,
      serviceCharge,
      total,
      transactionDate,
      transactionReference: reference,
      narrative,
    };
  } catch (error: any) {
    logger.error("Dashen verification failed:", error.message);
    throw error;
  }
}

export default verifyDashen;
