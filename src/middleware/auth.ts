import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const VALID_API_KEYS = (process.env.API_KEYS || 'test-key-123').split(',');

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;

  if (!apiKey) {
    logger.warn('Request without API key');
    return res.status(401).json({ error: 'API key required' });
  }

  if (!VALID_API_KEYS.includes(apiKey)) {
    logger.warn(`Invalid API key attempt: ${apiKey}`);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

export default apiKeyMiddleware;
