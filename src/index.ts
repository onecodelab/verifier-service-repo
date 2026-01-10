import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { verifyTelebirr } from './services/telebirr';
import { verifyCBE } from './services/cbe';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'sosha-verifier-service' });
});

// Telebirr Verification
app.post('/verify-telebirr', async (req, res) => {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference is required' });

    logger.info(`Verification request for Telebirr: ${reference}`);
    const result = await verifyTelebirr(reference);

    if (result) {
        res.json({
            success: true,
            data: result
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Record not found on Telebirr servers'
        });
    }
});

// CBE Verification
app.post('/verify-cbe', async (req, res) => {
    const { reference, accountSuffix } = req.body;
    if (!reference || !accountSuffix) {
        return res.status(400).json({ success: false, message: 'Reference and accountSuffix are required' });
    }

    logger.info(`Verification request for CBE: ${reference}`);
    const result = await verifyCBE(reference, accountSuffix);

    if (result.success) {
        res.json(result);
    } else {
        res.status(404).json(result);
    }
});

app.listen(PORT, () => {
    logger.info(`🚀 Verifier Service running on http://localhost:${PORT}`);
});
