import dotenv from 'dotenv';
import { App } from './app';
import { SessionStore } from './utils/session-store';

// Load environment variables
dotenv.config();

// Initialize session store
SessionStore.initialize();

async function startApp() {
    const app = new App();
    
    try {
        await app.start();
    } catch (error) {
        console.error('Fatal error starting application:', error);
        process.exit(1);
    }
}

// Start the application
startApp();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Saving sessions before shutdown...');
    SessionStore.save();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    SessionStore.save();
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    SessionStore.save();
    process.exit(1);
});

console.log('🤖 Telegram bot is running...');