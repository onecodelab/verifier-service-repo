
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyTelebirr } from './services/telebirr';
import { verifyCBE } from './services/cbe';
import { verifyDashen } from './services/dashen';
import { verifyAbyssinia } from './services/abyssinia';
import { verifyCBEBirr } from './services/cbebirr';
import { verifyImage } from './services/image';
import { normalizeTelebirr, normalizeCBE, normalizeDashen, normalizeAbyssinia, normalizeCBEBirr } from './utils/normalizer';
import { validateTransaction } from './utils/secondaryValidator';
import { logger } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { buildVerificationCacheKey, getCachedVerification, setCachedVerification } from './utils/verificationCache';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pgglpdnxrvndwxwbmajf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    logger.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
    process.exit(1);
}

// We really need SERVICE ROLE KEY for full access, but we use RPCs to bypass RLS if using ANON
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const WORKER_ID = `worker-${uuidv4()}`;

export async function startWorker() {
    logger.info(`Starting Worker ${WORKER_ID}...`);
    processNextJob();
}

async function processNextJob() {
    try {
        // 1. Checkout Job
        const { data: jobs, error } = await supabase.rpc('checkout_verification_job', {
            worker_id_param: WORKER_ID
        });

        if (error) {
            logger.error('Error checking out job:', error);
            setTimeout(processNextJob, 5000);
            return;
        }

        if (!jobs || jobs.length === 0) {
            // No jobs, wait and retry
            setTimeout(processNextJob, 2000);
            return;
        }

        const job = jobs[0];
        if (!job) {
            // This can happen if the RPC returns [null], e.g. when no jobs are available
            setTimeout(processNextJob, 2000);
            return;
        }
        logger.info(`Processing Job ${job.id} (${job.payment_method})`);

        let result: any = null;
        let jobStatus: 'completed' | 'failed' = 'completed';
        let failReason: string | null = null;

        const { payment_method, id: jobId } = job;
        if (!payment_method) {
            logger.warn(`Job ${jobId} has no payment method. Skipping.`);
            await supabase.rpc('complete_verification_job', {
                job_id_param: jobId,
                status_param: 'failed',
                result_param: { success: false, error: 'Missing payment method' },
                error_param: 'Missing payment method'
            });
            setTimeout(processNextJob, 1000);
            return;
        }

        try {
            const { reference, additional_data, expected_amount } = job;
            const extra = additional_data || {};
            const cacheKey = buildVerificationCacheKey([
                'worker',
                payment_method,
                reference,
                expected_amount,
                extra.accountSuffix,
                extra.suffix,
                extra.phoneNumber,
                extra.receiptNumber,
                extra.expected_receiver
            ]);

            const cachedResponse = await getCachedVerification<any>(cacheKey);
            if (cachedResponse) {
                logger.info(`Worker cache hit for job ${job.id} (${payment_method})`);
                result = cachedResponse;
                jobStatus = cachedResponse.validated ? 'completed' : 'failed';
                failReason = cachedResponse.error || null;
            } else {
                let rawData: any;
                let normalized: any;

                switch (payment_method) {
                    case 'telebirr':
                        rawData = await verifyTelebirr(reference);
                        normalized = normalizeTelebirr(rawData, reference);
                        break;
                    case 'cbe':
                        if (!extra.accountSuffix) throw new Error('Missing accountSuffix');
                        rawData = await verifyCBE(reference, extra.accountSuffix);
                        normalized = normalizeCBE(rawData);
                        break;
                    case 'dashen':
                        rawData = await verifyDashen(reference);
                        normalized = normalizeDashen(rawData);
                        break;
                    case 'abyssinia':
                        if (!extra.suffix) throw new Error('Missing suffix');
                        rawData = await verifyAbyssinia(reference, extra.suffix);
                        normalized = normalizeAbyssinia(rawData);
                        break;
                    case 'cbebirr':
                        if (!extra.phoneNumber) throw new Error('Missing phoneNumber');
                        rawData = await verifyCBEBirr(extra.receiptNumber || reference, extra.phoneNumber);
                        normalized = normalizeCBEBirr(rawData);
                        break;
                    case 'image':
                        if (!extra.image) throw new Error('Missing image');
                        rawData = await verifyImage(extra.image, extra.suffix);
                        normalized = { success: rawData.verified, ...rawData };
                        break;
                    default:
                        throw new Error(`Unknown method: ${payment_method}`);
                }

                if (normalized.success) {
                    const validation = validateTransaction(normalized, expected_amount, payment_method, extra.expected_receiver);
                    result = {
                        success: true,
                        validated: validation.passed,
                        amount: normalized.amount,
                        receipt_reference: normalized.receipt_reference,
                        validation,
                        raw: normalized
                    };

                    if (validation.passed) {
                        await setCachedVerification(cacheKey, result);
                    }
                } else {
                    jobStatus = 'failed';
                    failReason = normalized.error || 'Scraping failed';
                    result = { success: false, error: failReason };
                }
            }

        } catch (err: any) {
            jobStatus = 'failed';
            failReason = err.message || 'Worker Error';
            result = { success: false, error: failReason };
            logger.error(`Job ${job.id} failed:`, err);
        }

        // 3. Complete Job
        const { error: completeError } = await supabase.rpc('complete_verification_job', {
            job_id_param: job.id,
            status_param: jobStatus,
            result_param: result,
            error_param: failReason
        });

        if (completeError) {
            logger.error(`Failed to complete job ${job.id}`, completeError);
        } else {
            logger.info(`Job ${job.id} ${jobStatus}`);
        }

        // Immediate next tick
        setImmediate(processNextJob);

    } catch (err) {
        logger.error('Worker Loop Error:', err);
        setTimeout(processNextJob, 5000);
    }
}
