import dotenv from 'dotenv';
import { App } from './app';
import { SessionStore } from './utils/session-store';

// Load environment variables
dotenv.config();

// Set environment variables if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.RENDER = process.env.RENDER || 'false';

// Initialize session store
SessionStore.initialize();

async function verifyEnvironment() {
    console.log('Verifying environment...');
    
    const requiredVars = ['TELEGRAM_BOT_TOKEN'];
    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Verify bot token format
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token?.includes(':')) {
        throw new Error('Invalid bot token format');
    }

    console.log('Environment verification passed');
}

async function startApp() {
    try {
        await verifyEnvironment();
        
        console.log('Starting application...');
        console.log('Environment:', {
            NODE_ENV: process.env.NODE_ENV,
            DEBUG: process.env.DEBUG,
            BOT_TOKEN: 'Set (verified)',
            BOT_TOKEN_LENGTH: process.env.TELEGRAM_BOT_TOKEN?.length
        });

        const app = new App();
        
        console.log('Initializing bot...');
        await app.start();
        console.log('✅ Bot started successfully');
        console.log('🤖 Bot is ready to receive messages');
        
        // Test the bot's ability to handle updates
        console.log('Testing update handling...');
        
    } catch (error) {
        console.error('❌ Fatal error starting application:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        process.exit(1);
    }
}

// Start the application
startApp().catch(error => {
    console.error('Unhandled error in startApp:', error);
    process.exit(1);
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
    SessionStore.save();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    SessionStore.save();
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Saving sessions before shutdown...');
    SessionStore.save();
    process.exit(0);
});

console.log('🤖 Telegram bot is running...');