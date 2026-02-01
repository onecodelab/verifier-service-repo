/**
 * Normalized Verifier Response Types
 * 
 * Standardized response format that all bank-specific scrapers normalize to.
 * This enables consistent secondary validation across all payment methods.
 */

export type TransactionStatus = 'success' | 'failed' | 'pending';

/**
 * Normalized response from any bank scraper
 */
export interface NormalizedVerifierResponse {
    /** Whether the scrape operation succeeded */
    success: boolean;

    /** Payment method identifier */
    payment_method: string;

    /** Transaction amount in ETB */
    amount: number;

    /** Name of the receiving party (business) */
    receiver_name?: string;

    /** Account number of the receiving party */
    receiver_account?: string;

    /** Name of the paying party (customer) */
    payer_name?: string;

    /** Account/phone of the paying party */
    payer_account?: string;

    /** Transaction date in ISO format */
    date: string;

    /** Full timestamp if available */
    timestamp?: string;

    /** Bank-provided receipt/transaction reference */
    receipt_reference: string;

    /** Transaction status from bank */
    status: TransactionStatus;

    /** Original raw scraped data for debugging */
    raw_data?: any;

    /** Error message if scrape failed */
    error?: string;
}

/**
 * Validation check results
 */
export interface ValidationChecks {
    amount_match: boolean;
    receiver_account_match: boolean | null;  // null if not applicable
    receiver_name_match: boolean | null;     // null if not applicable
    date_within_window: boolean;
}

/**
 * Result from secondary validation
 */
export interface ValidationResult {
    passed: boolean;
    checks: ValidationChecks;
    failed_reasons: string[];
}

/**
 * Final response from /verify-payment endpoint
 */
export interface VerifyPaymentResponse {
    /** Whether scrape operation succeeded */
    success: boolean;

    /** Whether all validation checks passed */
    validated: boolean;

    /** Transaction amount */
    amount?: number;

    /** Receipt reference */
    receipt_reference?: string;

    /** Detailed validation results */
    validation?: ValidationResult;

    /** Error message if failed */
    error?: string;
}
