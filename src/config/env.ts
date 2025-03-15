import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'API_BASE_URL',
    'PUSHER_KEY',
    'PUSHER_CLUSTER'
] as const;

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Ensure required variables are defined
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE_URL = process.env.API_BASE_URL!;

// Log configuration on startup (excluding sensitive data)
console.log('Environment Configuration:');
console.log('API URL:', API_BASE_URL);
console.log('KYC URL:', process.env.KYC_URL || 'https://kyc.copperx.io');
console.log('Website URL:', process.env.WEBSITE_URL || 'https://copperx.io');

export const CONFIG = {
    TELEGRAM: {
        BOT_TOKEN: TELEGRAM_BOT_TOKEN,
        APP_ID: process.env.TELEGRAM_APP_ID || '',
        APP_HASH: process.env.TELEGRAM_APP_HASH || ''
    },
    API: {
        BASE_URL: API_BASE_URL,
        TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
        RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10)
    },
    PUSHER: {
        KEY: process.env.PUSHER_KEY || 'e089376087cac1a62785',
        CLUSTER: process.env.PUSHER_CLUSTER || 'ap1',
        AUTH_ENDPOINT: `${API_BASE_URL}/api/notifications/auth`
    },
    APP: {
        KYC_URL: process.env.KYC_URL || 'https://kyc.copperx.io',
        WEBSITE_URL: process.env.WEBSITE_URL || 'https://copperx.io',
        ENV: process.env.NODE_ENV || 'development',
        DEBUG: process.env.DEBUG === 'true'
    }
};

// Validate API URL format
try {
    new URL(CONFIG.API.BASE_URL);
} catch (error) {
    throw new Error(`Invalid API_BASE_URL: ${CONFIG.API.BASE_URL}`);
}

// Export additional helper functions
export const isProduction = () => CONFIG.APP.ENV === 'production';
export const isDevelopment = () => CONFIG.APP.ENV === 'development';
export const isDebug = () => CONFIG.APP.DEBUG;

// Log startup mode
console.log('Running in', CONFIG.APP.ENV, 'mode');
if (CONFIG.APP.DEBUG) {
    console.log('Debug mode enabled');
}