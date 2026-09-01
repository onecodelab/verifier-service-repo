import { logger } from '../utils/logger';

// Direct integration with official verify.et platform
const OFFICIAL_VERIFIER_URL = process.env.OFFICIAL_VERIFIER_URL || 'https://verify.et';
const OFFICIAL_VERIFIER_KEY = process.env.OFFICIAL_VERIFIER_KEY || 'VERIFY_BANK_ET_D1z7Tz7xL2nNSO4MXMTL-PWhvk7LBZzdaRxCFYBOWTEId_VuhzUxJ2HV_UMEeePZ';

export const verifyWithOfficialSDK = async (method: string, reference: string, options: any = {}) => {
  try {
    logger.info(`Attempting official verification for ${method}: ${reference}`);
    const ref = reference.trim().toUpperCase();
    const suffix = options.suffix || options.accountSuffix || options.expected_receiver || '';
    const phoneNumber = options.phoneNumber || options.phone || '';

    const response = await fetch(`${OFFICIAL_VERIFIER_URL}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': OFFICIAL_VERIFIER_KEY
      },
      body: JSON.stringify({
        bank: method,
        reference: ref,
        ...(suffix ? { suffix: String(suffix), accountSuffix: String(suffix) } : {}),
        ...(phoneNumber ? { phoneNumber: String(phoneNumber), phone: String(phoneNumber) } : {})
      })
    });

    const raw = await response.json().catch(() => null);
    if (!raw) throw new Error('Empty response from verify.et');

    const dRaw = (raw?.data && typeof raw.data === 'object') ? (Array.isArray(raw.data) ? raw.data[0] : raw.data) : raw;
    const d = (dRaw && typeof dRaw === 'object' && dRaw.result) ? dRaw.result : dRaw;

    const isOk = raw?.ok === true || raw?.success === true || raw?.validated === true || d?.status === 'success' || d?.verified === true;
    if (isOk && d?.status !== 'failed') {
      const amountRaw = d?.amount ?? d?.settledAmount ?? d?.totalPaidAmount ?? d?.txnAmount ?? d?.amountValue ?? null;
      const amount = amountRaw ? parseFloat(String(amountRaw).replace(/[^0-9.]/g, '')) : null;

      return {
        success: true,
        amount: amount,
        receipt_reference: d?.referenceNumber ?? d?.reference ?? ref,
        payer_name: d?.senderName ?? d?.payerName ?? d?.payer ?? null,
        receiver_name: d?.receiverName ?? null,
        receiver_account: d?.receiverAccount ?? d?.receiverName ?? null,
        transaction_date: d?.timestamp ?? d?.txnDate ?? null,
        raw: raw
      };
    } else {
      const errMsg = raw?.error || d?.reason || raw?.message || 'Verification failed';
      logger.warn(`Official verification failed for ${method}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  } catch (error: any) {
    logger.error(`Official SDK Error [${method}]:`, error.message);
    return { success: false, error: error.message };
  }
};
