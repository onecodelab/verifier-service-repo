/**
 * Receiver Profiles Configuration
 * 
 * These profiles define the expected recipient account/name for each payment method.
 * Used by secondary validation layer to verify payments reached the correct business account.
 * 
 * TODO: Replace placeholder values with actual business account numbers/names.
 */

export interface ReceiverProfile {
    receiver_name?: string;
    receiver_account?: string;
}

export const RECEIVER_PROFILES: Record<string, ReceiverProfile> = {
    telebirr: {
        receiver_name: "Zinet Selman Wabela",
        receiver_account: "0962071522"
    },
    cbe: {
        receiver_account: "1000356042704"
    },
    dashen: {
        receiver_name: "SOSHA OS PLC"
    },
    abyssinia: {
        receiver_account: "138816408"
    },
    cbebirr: {
        receiver_name: "SOSHA OS PLC"
    }
};

/**
 * Validation Configuration
 */
export const VALIDATION_CONFIG = {
    /** Allow transactions within ±N hours of current time */
    timeWindowHours: 24,

    /** Enable strict name matching (case-insensitive but exact) */
    strictNameMatch: false,

    /** 
     * Allow amount tolerance in ETB for UNDERPAYMENTS.
     * Overpayments are always allowed (considered tips).
     */
    amountToleranceETB: 1,

    /** Number of last digits to check for receiver account matching */
    receiverAccountSuffixDigits: 6
};

export default RECEIVER_PROFILES;
