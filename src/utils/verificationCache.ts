import axios from 'axios';
import crypto from 'crypto';
import logger from './logger';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const CACHE_TTL_SECONDS = Number(process.env.VERIFIER_CACHE_TTL_SECONDS || 300);
const CACHE_PREFIX = 'baro:verifier:v1';

function isEnabled(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

function normalizeKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function buildVerificationCacheKey(parts: Array<string | number | boolean | null | undefined>): string {
  const raw = parts
    .map((part) => (part === null || part === undefined ? '' : String(part).trim()))
    .join('|');

  return `${CACHE_PREFIX}:${normalizeKey(raw)}`;
}

export async function getCachedVerification<T>(key: string): Promise<T | null> {
  if (!isEnabled()) {
    return null;
  }

  try {
    const response = await axios.get(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`
      },
      timeout: 4000
    });

    const value = response.data?.result;
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error: any) {
    logger.warn(`Redis cache read failed for ${key}: ${error.message || error}`);
    return null;
  }
}

export async function setCachedVerification<T>(key: string, value: T, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  try {
    await axios.post(
      `${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?ex=${ttlSeconds}`,
      null,
      {
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`
        },
        timeout: 4000
      }
    );
  } catch (error: any) {
    logger.warn(`Redis cache write failed for ${key}: ${error.message || error}`);
  }
}
