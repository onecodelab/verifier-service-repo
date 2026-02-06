import axios from "axios";
import { load } from "cheerio";
import { logger } from "../logger";

export async function verifyTelebirr(reference: string) {
  try {
    const skipPrimary = process.env.SKIP_PRIMARY_VERIFICATION === "true";
    let url = `https://transactioninfo.ethiotelecom.et/receipt/${reference}`;

    try {
      if (!skipPrimary) {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        const $ = load(response.data);
        const payerName = $('td:contains("Payer")').next().text().trim();
        const receiverName = $('td:contains("Receiver")').next().text().trim();
        const amount = $('td:contains("Amount")').next().text().trim();
        const status = $('td:contains("Status")').next().text().trim();
        const date = $('td:contains("Date")').next().text().trim();
        const fees = $('td:contains("Fee")').next().text().trim();
        const total = $('td:contains("Total")').next().text().trim();

        if (!payerName) throw new Error("Receipt not found");

        return {
          success: true,
          payerName,
          receiverName,
          amount,
          status,
          date,
          reference,
          fees,
          total,
        };
      }
    } catch (primaryError: any) {
      logger.warn(
        `Primary Telebirr verification failed: ${primaryError.message}`
      );
    }

    // Fallback to relay service
    const relayUrl =
      process.env.TELEBIRR_RELAY || "https://relay.example.com/verify-telebirr";
    const relayResponse = await axios.post(relayUrl, { reference });
    return relayResponse.data;
  } catch (error: any) {
    logger.error("Telebirr verification failed:", error.message);
    throw error;
  }
}

export default verifyTelebirr;
