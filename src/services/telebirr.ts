import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import logger from '../utils/logger';

export interface TelebirrReceipt {
    payerName: string;
    payerTelebirrNo: string;
    creditedPartyName: string;
    creditedPartyAccountNo: string;
    transactionStatus: string;
    receiptNo: string;
    paymentDate: string;
    settledAmount: string;
    serviceFee: string;
    serviceFeeVAT: string;
    totalPaidAmount: string;
    bankName: string;
}

function extractSettledAmountRegex(htmlContent: string): string | null {
    const pattern = /የተከፈለው\s+መጠን\/Settled\s+Amount.*?<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d{2})?\s+Birr)/is;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractReceiptNoRegex(htmlContent: string): string | null {
    const pattern = /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractDateRegex(htmlContent: string): string | null {
    const pattern = /(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/;
    const match = htmlContent.match(pattern);
    return match ? match[1].trim() : null;
}

function extractWithRegex(htmlContent: string, labelPattern: string): string | null {
    const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedLabel}.*?<\\/td>\\s*<td[^>]*>\\s*([^<]+)`, 'i');
    const match = htmlContent.match(pattern);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : null;
}

function scrapeTelebirrReceipt(html: string): TelebirrReceipt {
    const $ = cheerio.load(html);

    const getText = (label: string): string => {
        return extractWithRegex(html, label) || "";
    };

    return {
        payerName: getText("የከፋይ ስም/Payer Name"),
        payerTelebirrNo: getText("የከፋይ ቴሌብር ቁ./Payer telebirr no."),
        creditedPartyName: getText("የገንዘብ ተቀባይ ስም/Credited Party name"),
        creditedPartyAccountNo: getText("የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no"),
        transactionStatus: getText("የክፍያው ሁኔታ/transaction status"),
        receiptNo: extractReceiptNoRegex(html) || "",
        paymentDate: extractDateRegex(html) || "",
        settledAmount: extractSettledAmountRegex(html) || "",
        serviceFee: extractWithRegex(html, "የአገልግሎት ክፍያ/Service fee") || "",
        serviceFeeVAT: extractWithRegex(html, "የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT") || "",
        totalPaidAmount: extractWithRegex(html, "ጠቅላላ የተከፈለ/Total Paid Amount") || "",
        bankName: ""
    };
}

export async function verifyTelebirr(reference: string): Promise<TelebirrReceipt | null> {
    const url = `https://transactioninfo.ethiotelecom.et/receipt/${reference}`;
    try {
        logger.info(`Attempting to fetch Telebirr receipt: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        const data = scrapeTelebirrReceipt(response.data);
        if (data.receiptNo && data.payerName) return data;
        return null;
    } catch (error: any) {
        logger.error(`Error fetching Telebirr receipt: ${error.message}`);
        return null;
    }
}
