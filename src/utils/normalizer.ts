/**
 * Response Normalizer
 * 
 * Transforms bank-specific response formats into a unified NormalizedVerifierResponse.
 * Each bank returns different field names - this normalizes them for consistent validation.
 */

import { NormalizedVerifierResponse, TransactionStatus } from '../types/normalizedTypes';
import { TelebirrReceipt } from '../services/telebirr';
import { CBEVerifyResult } from '../services/cbe';
import { DashenVerifyResult } from '../services/dashen';
import { AbyssiniaVerifyResult } from '../services/abyssinia';
import { CBEBirrVerifyResult } from '../services/cbebirr';

/**
 * Parse amount string to number, handling currency symbols and formatting
 */
function parseAmount(amountStr: string | number | undefined): number {
    if (typeof amountStr === 'number') return amountStr;
    if (!amountStr) return 0;

    // Remove currency symbols, commas, "Birr", "ETB", whitespace
    const cleaned = amountStr
        .replace(/[,]/g, '')
        .replace(/birr/gi, '')
        .replace(/etb/gi, '')
        .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse various date formats to ISO string
 */
function parseDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return new Date().toISOString();
    if (dateStr instanceof Date) return dateStr.toISOString();

    // Try parsing common formats
    // Telebirr format: "DD-MM-YYYY HH:mm:ss"
    const telebirrMatch = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (telebirrMatch) {
        const [, day, month, year, hour, min, sec] = telebirrMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
    }

    // Try standard parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }

    return new Date().toISOString();
}

/**
 * Determine transaction status from various bank response formats
 */
function parseStatus(rawStatus: string | undefined): TransactionStatus {
    if (!rawStatus) return 'pending';

    const lower = rawStatus.toLowerCase();
    if (lower.includes('success') || lower.includes('completed') || lower.includes('paid')) {
        return 'success';
    }
    if (lower.includes('fail') || lower.includes('reject') || lower.includes('cancel')) {
        return 'failed';
    }
    return 'pending';
}

/**
 * Normalize Telebirr receipt response
 */
export function normalizeTelebirr(data: TelebirrReceipt | null, reference: string): NormalizedVerifierResponse {
    if (!data) {
        return {
            success: false,
            payment_method: 'telebirr',
            amount: 0,
            date: new Date().toISOString(),
            receipt_reference: reference,
            status: 'failed',
            error: 'Failed to fetch Telebirr receipt'
        };
    }

    return {
        success: true,
        payment_method: 'telebirr',
        amount: parseAmount(data.settledAmount),
        receiver_name: data.creditedPartyName || undefined,
        receiver_account: data.creditedPartyAccountNo || undefined,
        payer_name: data.payerName || undefined,
        payer_account: data.payerTelebirrNo || undefined,
        date: parseDate(data.paymentDate),
        receipt_reference: data.receiptNo || reference,
        status: parseStatus(data.transactionStatus),
        raw_data: data
    };
}

/**
 * Normalize CBE response
 */
export function normalizeCBE(data: CBEVerifyResult): NormalizedVerifierResponse {
    if (!data.success) {
        return {
            success: false,
            payment_method: 'cbe',
            amount: 0,
            date: new Date().toISOString(),
            receipt_reference: data.reference || '',
            status: 'failed',
            error: data.error || 'CBE verification failed'
        };
    }

    return {
        success: true,
        payment_method: 'cbe',
        amount: data.amount || 0,
        receiver_name: data.receiver || undefined,
        receiver_account: data.receiverAccount || undefined,
        payer_name: data.payer || undefined,
        payer_account: data.payerAccount || undefined,
        date: data.date ? data.date.toISOString() : new Date().toISOString(),
        receipt_reference: data.reference || '',
        status: 'success',
        raw_data: data
    };
}

/**
 * Normalize Dashen response
 */
export function normalizeDashen(data: DashenVerifyResult): NormalizedVerifierResponse {
    if (!data.success) {
        return {
            success: false,
            payment_method: 'dashen',
            amount: 0,
            date: new Date().toISOString(),
            receipt_reference: data.transactionReference || '',
            status: 'failed',
            error: data.error || 'Dashen verification failed'
        };
    }

    return {
        success: true,
        payment_method: 'dashen',
        amount: parseAmount(data.transactionAmount),
        receiver_name: data.receiverName || undefined,
        receiver_account: data.receiverAccountNumber || undefined, // ADDED
        payer_name: data.senderName || undefined,
        payer_account: data.senderAccountNumber || undefined,
        date: parseDate(data.transactionDate),
        receipt_reference: data.transactionReference || '',
        status: 'success',
        raw_data: data
    };
}

/**
 * Normalize Abyssinia response
 */
export function normalizeAbyssinia(data: AbyssiniaVerifyResult): NormalizedVerifierResponse {
    if (!data.success) {
        return {
            success: false,
            payment_method: 'abyssinia',
            amount: 0,
            date: new Date().toISOString(),
            receipt_reference: data.transactionReference || '',
            status: 'failed',
            error: data.error || 'Abyssinia verification failed'
        };
    }

    return {
        success: true,
        payment_method: 'abyssinia',
        amount: parseAmount(data.amount),
        receiver_name: data.receiver || undefined,
        receiver_account: data.receiverAccount || undefined, // ADDED
        payer_name: data.payer || undefined,
        payer_account: data.payerAccount || undefined,
        date: parseDate(data.date),
        receipt_reference: data.transactionReference || '',
        status: parseStatus(data.status),
        raw_data: data
    };
}

/**
 * Normalize CBE Birr response
 */
export function normalizeCBEBirr(data: CBEBirrVerifyResult): NormalizedVerifierResponse {
    if (!data.success) {
        return {
            success: false,
            payment_method: 'cbebirr',
            amount: 0,
            date: new Date().toISOString(),
            receipt_reference: data.receiptNumber || '',
            status: 'failed',
            error: data.error || 'CBE Birr verification failed'
        };
    }

    return {
        success: true,
        payment_method: 'cbebirr',
        amount: parseAmount(data.amount),
        receiver_name: data.receiver || undefined,
        receiver_account: data.receiverAccount || undefined, // ADDED
        payer_name: data.payer || undefined,
        date: parseDate(data.timestamp),
        receipt_reference: data.receiptNumber || '',
        status: parseStatus(data.status),
        raw_data: data
    };
}
