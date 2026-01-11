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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    version: '1.0.0',
    endpoints: [
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
