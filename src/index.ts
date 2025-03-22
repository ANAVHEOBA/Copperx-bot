import dotenv from 'dotenv';
import { App } from './app';
import { SessionStore } from './utils/session-store';

// Load environment variables
dotenv.config();

// Initialize session store
SessionStore.initialize();

// Start the application
const app = new App();
app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Saving sessions before shutdown...');
    SessionStore.save();
    process.exit(0);
});

console.log('🤖 Telegram bot is running...');