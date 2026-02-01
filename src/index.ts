import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { verifyTelebirr } from './services/telebirr';
import { verifyCBE } from './services/cbe';
import { verifyDashen } from './services/dashen';
import { verifyAbyssinia } from './services/abyssinia';
import { verifyCBEBirr } from './services/cbebirr';
import { verifyImage } from './services/image';
import { logger } from './utils/logger';
import { apiKeyMiddleware } from './middleware/auth';

// Secondary Validation Layer Imports
import { NormalizedVerifierResponse, VerifyPaymentResponse } from './types/normalizedTypes';
import {
  normalizeTelebirr,
  normalizeCBE,
  normalizeDashen,
  normalizeAbyssinia,
  normalizeCBEBirr
} from './utils/normalizer';
import { validateTransaction } from './utils/secondaryValidator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Information
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Verifier API is running',
    version: '2.0.0',
    endpoints: [
      '/verify-payment',  // NEW: Consolidated endpoint with validation
      '/verify-cbe',
      '/verify-telebirr',
      '/verify-dashen',
      '/verify-abyssinia',
      '/verify-cbebirr',
      '/verify-image',
    ],
    health: '/health',
    documentation: 'https://github.com/onecodelab/-verifier-service-repo',
  });
});

// ============================================================
// CONSOLIDATED VERIFY-PAYMENT ENDPOINT (with Secondary Validation)
// ============================================================
app.post('/verify-payment', apiKeyMiddleware, async (req: Request, res: Response) => {
  const {
    payment_method,
    reference,
    expected_amount,
    // Bank-specific optional params
    accountSuffix,  // CBE
    suffix,         // Abyssinia
    phoneNumber,    // CBE Birr
    receiptNumber   // CBE Birr
  } = req.body;

  // Validate required fields
  if (!payment_method || !reference || expected_amount === undefined) {
    return res.status(400).json({
      success: false,
      validated: false,
      error: 'payment_method, reference, and expected_amount are required'
    });
  }

  try {
    let normalized: NormalizedVerifierResponse;

    // Route to correct bank scraper and normalize response
    switch (payment_method) {
      case 'telebirr': {
        const rawData = await verifyTelebirr(reference);
        normalized = normalizeTelebirr(rawData, reference);
        break;
      }
      case 'cbe': {
        if (!accountSuffix) {
          return res.status(400).json({
            success: false,
            validated: false,
            error: 'accountSuffix required for CBE'
          });
        }
        const rawData = await verifyCBE(reference, accountSuffix);
        normalized = normalizeCBE(rawData);
        break;
      }
      case 'dashen': {
        const rawData = await verifyDashen(reference);
        normalized = normalizeDashen(rawData);
        break;
      }
      case 'abyssinia': {
        if (!suffix) {
          return res.status(400).json({
            success: false,
            validated: false,
            error: 'suffix required for Abyssinia'
          });
        }
        const rawData = await verifyAbyssinia(reference, suffix);
        normalized = normalizeAbyssinia(rawData);
        break;
      }
      case 'cbebirr': {
        const rcpt = receiptNumber || reference;
        if (!phoneNumber) {
          return res.status(400).json({
            success: false,
            validated: false,
            error: 'phoneNumber required for CBE Birr'
          });
        }
        const rawData = await verifyCBEBirr(rcpt, phoneNumber);
        normalized = normalizeCBEBirr(rawData);
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          validated: false,
          error: `Unsupported payment method: ${payment_method}`
        });
    }

    // If scrape failed, return early
    if (!normalized.success) {
      const response: VerifyPaymentResponse = {
        success: false,
        validated: false,
        error: normalized.error || 'Failed to fetch transaction data'
      };
      return res.json(response);
    }

    // Run secondary validation
    const validation = validateTransaction(normalized, expected_amount, payment_method);

    // Build response
    const response: VerifyPaymentResponse = {
      success: true,
      validated: validation.passed,
      amount: normalized.amount,
      receipt_reference: normalized.receipt_reference,
      validation
    };

    // Log for audit
    logger.info(`Verify-payment [${payment_method}]: validated=${validation.passed}, amount=${normalized.amount}, ref=${reference}`);

    res.json(response);
  } catch (error: any) {
    logger.error(`Verify-payment error [${payment_method}]:`, error);
    res.status(500).json({
      success: false,
      validated: false,
      error: error.message || 'Verification failed'
    });
  }
});

// ============================================================
// LEGACY INDIVIDUAL BANK ENDPOINTS (kept for backward compatibility)
// ============================================================

// Verification Endpoints
// CBE Verification
app.post('/verify-cbe', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference, accountSuffix } = req.body;
    if (!reference || !accountSuffix) {
      return res.status(400).json({ error: 'reference and accountSuffix required' });
    }
    const result = await verifyCBE(reference, accountSuffix);
    res.json(result);
  } catch (error: any) {
    logger.error('CBE verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// Telebirr Verification
app.post('/verify-telebirr', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: 'reference required' });
    }
    const result = await verifyTelebirr(reference);
    res.json(result);
  } catch (error: any) {
    logger.error('Telebirr verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// Dashen Verification
app.post('/verify-dashen', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: 'reference required' });
    }
    const result = await verifyDashen(reference);
    res.json(result);
  } catch (error: any) {
    logger.error('Dashen verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// Bank of Abyssinia Verification
app.post('/verify-abyssinia', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference, suffix } = req.body;
    if (!reference || !suffix) {
      return res.status(400).json({ error: 'reference and suffix required' });
    }
    const result = await verifyAbyssinia(reference, suffix);
    res.json(result);
  } catch (error: any) {
    logger.error('Abyssinia verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// CBE Birr Verification
app.post('/verify-cbebirr', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { receiptNumber, phoneNumber } = req.body;
    if (!receiptNumber || !phoneNumber) {
      return res.status(400).json({ error: 'receiptNumber and phoneNumber required' });
    }
    const result = await verifyCBEBirr(receiptNumber, phoneNumber);
    res.json(result);
  } catch (error: any) {
    logger.error('CBE Birr verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// Image Verification
app.post('/verify-image', apiKeyMiddleware, async (req: Request, res: Response) => {
  try {
    const { image, suffix } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'image required' });
    }
    const result = await verifyImage(image, suffix);
    res.json(result);
  } catch (error: any) {
    logger.error('Image verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

app.listen(PORT, () => {
  logger.info(`Payment Verifier API running on port ${PORT}`);
});

export default app;
