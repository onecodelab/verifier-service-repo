/**
 * Secondary Validator
 * 
 * Validates normalized transaction data against expected receiver profiles.
 * This runs server-side AFTER the scraper returns data, BEFORE allowing order closure.
 * 
 * Validation Rules:
 * 1. Amount must match expected (within tolerance)
 * 2. Receiver account must match profile (if profile specifies account)
 * 3. Receiver name must match profile (if profile specifies name)
 * 4. Transaction date must be within allowed time window
 */

import { NormalizedVerifierResponse, ValidationResult, ValidationChecks } from '../types/normalizedTypes';
import { RECEIVER_PROFILES, VALIDATION_CONFIG, ReceiverProfile } from '../config/receiverProfiles';
import { logger } from './logger';

/**
 * Compare receiver names with fuzzy matching
 * - Case insensitive
 * - Ignores extra whitespace
 * - Checks if one contains the other (for partial matches)
 */
function namesMatch(actual: string | undefined, expected: string | undefined): boolean | null {
    if (!expected) return null; // Profile doesn't specify name
    if (!actual) return false;  // Expected name but not provided

    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const actualNorm = normalize(actual);
    const expectedNorm = normalize(expected);

    // Exact match or contains match
    return actualNorm === expectedNorm ||
        actualNorm.includes(expectedNorm) ||
        expectedNorm.includes(actualNorm);
}

/**
 * Compare receiver accounts
 * - Removes common prefixes/formatting
 * - Checks if one ends with the other (using configurable suffix digits)
 */
function accountsMatch(actual: string | undefined, expected: string | undefined, suffixDigits: number): boolean | null {
    if (!expected) return null; // Profile doesn't specify account
    if (!actual) return false;  // Expected account but not provided

    // Remove common formatting
    const normalize = (s: string) => s.replace(/[\s\-\.]/g, '');
    const actualNorm = normalize(actual);
    const expectedNorm = normalize(expected);

    // Get the last N digits to compare
    const actualSuffix = actualNorm.slice(-suffixDigits);
    const expectedSuffix = expectedNorm.slice(-suffixDigits);

    // If actual is shorter than suffixDigits, it's a mismatch unless suffixDigits is huge
    if (actualSuffix.length < Math.min(suffixDigits, expectedNorm.length)) return false;

    // Handle masking: if actual digit is * or x, it matches anything from the expected suffix
    for (let i = 0; i < actualSuffix.length; i++) {
        const actualChar = actualSuffix[i].toLowerCase();
        const expectedChar = expectedSuffix[i];

        if (actualChar === '*' || actualChar === 'x') continue;
        if (actualChar !== expectedChar) return false;
    }

    return true;
}

/**
 * Check if transaction date is within allowed time window
 */
function dateWithinWindow(transactionDate: string, windowHours: number): boolean {
    const txDate = new Date(transactionDate);
    const now = new Date();

    // Check if date is valid
    if (isNaN(txDate.getTime())) {
        logger.warn('Invalid transaction date:', transactionDate);
        return false;
    }

    const diffMs = Math.abs(now.getTime() - txDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours <= windowHours;
}

/**
 * Check if amounts match
 * logic: ONLY fail if actual < (expected - tolerance)
 * Overpayments are allowed (tips)
 */
function amountsMatch(actual: number, expected: number, tolerance: number): boolean {
    return actual >= (expected - tolerance);
}

/**
 * Main validation function
 * 
 * @param normalized - Normalized transaction data from scraper
 * @param expectedAmount - Expected order amount
 * @param paymentMethod - Payment method identifier
 * @returns ValidationResult with pass/fail and detailed reasons
 */
export function validateTransaction(
    normalized: NormalizedVerifierResponse,
    expectedAmount: number,
    paymentMethod: string
): ValidationResult {
    const profile: ReceiverProfile = RECEIVER_PROFILES[paymentMethod] || {};
    const failedReasons: string[] = [];

    // Initialize checks
    const checks: ValidationChecks = {
        amount_match: false,
        receiver_account_match: null,
        receiver_name_match: null,
        date_within_window: false
    };

    // 1. Amount Check
    checks.amount_match = amountsMatch(
        normalized.amount,
        expectedAmount,
        VALIDATION_CONFIG.amountToleranceETB
    );
    if (!checks.amount_match) {
        failedReasons.push(
            `Amount too low: expected min ${expectedAmount - VALIDATION_CONFIG.amountToleranceETB} ETB, but found ${normalized.amount} ETB`
        );
    }

    // 2. Receiver Account Check
    if (profile.receiver_account) {
        checks.receiver_account_match = accountsMatch(
            normalized.receiver_account,
            profile.receiver_account,
            VALIDATION_CONFIG.receiverAccountSuffixDigits
        );
        if (checks.receiver_account_match === false) {
            const expectedSuffix = profile.receiver_account.slice(-VALIDATION_CONFIG.receiverAccountSuffixDigits);
            const actualValue = normalized.receiver_account ?
                `...${normalized.receiver_account.slice(-VALIDATION_CONFIG.receiverAccountSuffixDigits)}` :
                'not found';

            failedReasons.push(
                `Wrong account: expected suffix ${expectedSuffix}, but found ${actualValue}`
            );
        }
    }

    // 3. Receiver Name Check
    if (profile.receiver_name) {
        checks.receiver_name_match = namesMatch(
            normalized.receiver_name,
            profile.receiver_name
        );
        if (checks.receiver_name_match === false) {
            failedReasons.push(
                `Wrong receiver name: expected "${profile.receiver_name}", but found "${normalized.receiver_name || 'none'}"`
            );
        }
    }

    // 4. Date Window Check
    checks.date_within_window = dateWithinWindow(
        normalized.date,
        VALIDATION_CONFIG.timeWindowHours
    );
    if (!checks.date_within_window) {
        failedReasons.push(
            `Transaction date outside allowed window (±${VALIDATION_CONFIG.timeWindowHours}h): ${normalized.date}`
        );
    }

    // Determine overall pass/fail
    // Must pass: amount + date
    // Must pass if configured: receiver_account, receiver_name
    const passed =
        checks.amount_match &&
        checks.date_within_window &&
        (checks.receiver_account_match === null || checks.receiver_account_match === true) &&
        (checks.receiver_name_match === null || checks.receiver_name_match === true);

    if (!passed) {
        logger.warn(`Secondary validation FAILED for ${paymentMethod}:`, failedReasons);
    } else {
        logger.info(`Secondary validation PASSED for ${paymentMethod}`);
    }

    return {
        passed,
        checks,
        failed_reasons: failedReasons
    };
}
