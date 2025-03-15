import dotenv from 'dotenv';
import { App } from './app';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Ensure .sessions.json exists
const sessionFile = path.join(__dirname, '../.sessions.json');
if (!fs.existsSync(sessionFile)) {
    fs.writeFileSync(sessionFile, '{}', 'utf8');
}

// Start the application
const app = new App();
app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

console.log('🤖 Telegram bot is running...');