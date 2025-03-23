import { Telegraf, session, Markup } from 'telegraf';
import { AuthRoute } from './modules/auth/auth.route';
import { KycRoute } from './modules/kyc/kyc.route';
import { WalletRoute } from './modules/wallet/wallet.route';
import { CONFIG } from './config/env';
import { Context, SessionData, Bot } from './types/context';
import * as fs from 'fs';
import * as path from 'path';
import { TransferRoute } from './modules/transfer/transfer.route';
import { NotificationsService } from './modules/notifications/notifications.service';
import { MenuService } from './modules/menu/menu.service';
import { Message } from 'telegraf/types';

export class App {
    private bot: Bot;
    private notificationsService: NotificationsService;
    private menuService: MenuService;
    private modules: any[] = [];
    private transferRoute: TransferRoute | undefined;
    private isShuttingDown: boolean = false;
    private readonly SESSION_FILE = path.join(__dirname, '../.sessions.json');
    private sessions: { [key: string]: SessionData } = {};
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 5000; // 5 seconds

    constructor() {
        if (!CONFIG.TELEGRAM.BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        this.bot = new Telegraf<Context>(CONFIG.TELEGRAM.BOT_TOKEN);
        this.notificationsService = new NotificationsService(this.bot);
        this.menuService = new MenuService(this.bot);
        this.loadSessions();
        this.initializeMiddlewares();
        this.initializeModules();
        this.setupErrorHandling();
        this.setupShutdown();
    }

    private loadSessions(): void {
        try {
            if (fs.existsSync(this.SESSION_FILE)) {
                const data = fs.readFileSync(this.SESSION_FILE, 'utf8');
                this.sessions = JSON.parse(data);
                console.log('Sessions loaded:', Object.keys(this.sessions).length);
                
                // Log session content in debug mode
                if (CONFIG.APP.DEBUG) {
                    console.log('Session data:', this.sessions);
                }
            } else {
                this.sessions = {};
                fs.writeFileSync(this.SESSION_FILE, JSON.stringify(this.sessions, null, 2));
                console.log('New sessions file created');
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
            this.sessions = {};
        }
    }

    private saveSessions(): void {
        try {
            fs.writeFileSync(this.SESSION_FILE, JSON.stringify(this.sessions, null, 2));
            console.log('Sessions saved:', Object.keys(this.sessions).length);
            
            // Log saved session content in debug mode
            if (CONFIG.APP.DEBUG) {
                console.log('Saved session data:', this.sessions);
            }
        } catch (error) {
            console.error('Failed to save sessions:', error);
        }
    }

    private initializeMiddlewares(): void {
        console.log('\n🔄 === INITIALIZING MIDDLEWARES ===');
        
        // Debug middleware - MUST be first
        this.bot.use(async (ctx, next) => {
            const startTime = Date.now();
            console.log('\n🔍 === NEW UPDATE RECEIVED ===');
            console.log('Update type:', ctx.updateType);
            console.log('Raw update:', JSON.stringify(ctx.update, null, 2));
            
            try {
                await next();
                const ms = Date.now() - startTime;
                console.log(`✅ Update processed in ${ms}ms`);
            } catch (error) {
                console.error('❌ Error in middleware:', error);
                console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
                throw error;
            }
        });

        // Session middleware
        this.bot.use(session());

        // Move command handlers BEFORE module initialization
        this.setupBaseHandlers();

        console.log('✅ Middlewares initialized');
    }

    private setupBaseHandlers(): void {
        console.log('\n🔧 Setting up base handlers...');

        // Debug handler for all updates
        this.bot.on('message', (ctx, next) => {
            console.log('\n📨 New message received:', {
                type: ctx.updateType,
                from: ctx.from?.id,
                chat: ctx.chat?.id,
                text: 'text' in ctx.message ? ctx.message.text : 'non-text message'
            });
            return next();
        });

        // Command handlers
        this.bot.command('start', async (ctx) => {
            console.log('🎯 /start command received');
            try {
                await ctx.reply('Welcome! I am your CopperX bot. How can I help you today?');
                console.log('✅ Start command response sent');
            } catch (error) {
                console.error('❌ Error in start command:', error);
            }
        });

        this.bot.command('help', async (ctx) => {
            console.log('❓ /help command received');
            try {
                await ctx.reply('Available commands:\n/start - Start the bot\n/help - Show this help message');
                console.log('✅ Help command response sent');
            } catch (error) {
                console.error('❌ Error in help command:', error);
            }
        });

        // Text message handler
        this.bot.on('text', async (ctx) => {
            if (ctx.message.text.startsWith('/')) {
                return; // Skip commands
            }
            
            console.log('📝 Processing text message:', ctx.message.text);
            try {
                await ctx.reply(`You said: ${ctx.message.text}`);
                console.log('✅ Reply sent');
            } catch (error) {
                console.error('❌ Error sending reply:', error);
                try {
                    await ctx.reply('Sorry, I encountered an error.');
                } catch (e) {
                    console.error('Failed to send error message:', e);
                }
            }
        });

        // Fallback handler for unhandled message types
        this.bot.on('message', async (ctx) => {
            console.log('⚠️ Unhandled message type:', ctx.updateType);
            try {
                await ctx.reply('I received your message but I\'m not sure how to handle it.');
            } catch (error) {
                console.error('❌ Error in fallback handler:', error);
            }
        });

        console.log('✅ Base handlers setup complete');
    }

    private initializeModules(): void {
        console.log('\n🔧 === INITIALIZING MODULES ===');
        
        try {
            // Initialize transfer route
            console.log('📝 Initializing transfer module...');
            this.transferRoute = new TransferRoute(this.bot);
            console.log('✅ Transfer module initialized');

            // Initialize other modules...
            console.log('📝 Initializing other modules...');
            this.modules = [
                new AuthRoute(this.bot),
                new KycRoute(this.bot),
                new WalletRoute(this.bot)
            ];
            console.log('✅ Other modules initialized');
        } catch (error) {
            console.error('❌ Error initializing modules:', error);
            throw error;
        }
    }

    private setupErrorHandling(): void {
        // Global error handler for updates
        this.bot.catch((error: unknown, ctx) => {
            console.error('Error while handling update:', error);
            
            // Type guard for Error
            if (error instanceof Error && 
                (error.message.includes('query is too old') || 
                error.message.includes('query ID is invalid'))) {
                // Handle expired callback queries gracefully
                if (ctx.callbackQuery) {
                    ctx.answerCbQuery()
                        .catch((e: Error) => console.error('Failed to answer callback query:', e));
                    
                    // Type guard for callback query data
                    if ('data' in ctx.callbackQuery && ctx.callbackQuery.data?.startsWith('menu_')) {
                        this.menuService.showMainMenu(ctx)
                            .catch((e: Error) => console.error('Failed to refresh menu:', e));
                    }
                }
                return;
            }

            // For other errors, notify the user
            if (ctx.chat) {
                ctx.reply('❌ An error occurred. Please try again.')
                    .catch((e: Error) => console.error('Failed to send error message:', e));
            }
        });
    }

    private setupShutdown(): void {
        const cleanup = async () => {
            console.log('\n🔄 Cleanup requested...');
            if (this.isShuttingDown) {
                console.log('❌ Already shutting down, ignoring request');
                return;
            }
            
            this.isShuttingDown = true;
            console.log('💾 Saving sessions...');
            this.saveSessions();
            
            console.log('🛑 Stopping bot...');
            await this.bot.stop();
            
            // Add a small delay before exit to allow logs to be written
            setTimeout(() => {
                console.log('👋 Exiting process...');
                process.exit(0);
            }, 1000);
        };

        // Only handle SIGINT and SIGTERM
        process.once('SIGINT', () => {
            console.log('\n⚠️ Received SIGINT signal');
            cleanup();
        });
        
        process.once('SIGTERM', () => {
            console.log('\n⚠️ Received SIGTERM signal');
            cleanup();
        });

        // Remove SIGUSR2 handler as it's not commonly used
        // process.once('SIGUSR2', cleanup);

        // Add unhandled rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            console.error('\n❌ Unhandled Promise Rejection:');
            console.error('Promise:', promise);
            console.error('Reason:', reason);
            // Don't exit the process, just log the error
        });

        // Add uncaught exception handler
        process.on('uncaughtException', (error) => {
            console.error('\n❌ Uncaught Exception:');
            console.error(error);
            // Don't exit the process, just log the error
        });
    }

    public async start(retryCount = 0): Promise<void> {
        try {
            console.log('\n🚀 === STARTING BOT ===');
            
            // First, delete any webhook to ensure we're in polling mode
            await this.bot.telegram.deleteWebhook();
            console.log('✅ Webhook deleted');

            // Get bot info
            const botInfo = await this.bot.telegram.getMe();
            console.log('✅ Bot info:', botInfo);
            console.log(`Bot username: @${botInfo.username}`);

            // Test message handler
            this.bot.on('text', (ctx) => {
                console.log('📝 Text received:', ctx.message.text);
            });

            // Launch bot with explicit polling
            await this.bot.launch({
                dropPendingUpdates: true,
                polling: {
                    timeout: 30
                },
                allowedUpdates: [
                    'message',
                    'callback_query',
                    'edited_message',
                    'channel_post',
                    'edited_channel_post',
                    'inline_query',
                    'chosen_inline_result',
                    'poll',
                    'poll_answer'
                ]
            });
            
            console.log('✅ Bot launched successfully in polling mode');
            console.log('🤖 Send a message to the bot to test it!');
            
            // Send a test message to verify bot is working
            if (process.env.NODE_ENV === 'development') {
                console.log('🔄 Running bot self-test...');
                try {
                    const testResult = await this.bot.telegram.getMe();
                    console.log('✅ Self-test passed:', testResult);
                } catch (error) {
                    console.error('❌ Self-test failed:', error);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            
            if (retryCount < this.MAX_RETRIES) {
                console.log(`Retrying in ${this.RETRY_DELAY/1000} seconds... (Attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.start(retryCount + 1);
            } else {
                throw new Error(`Failed to start bot after ${this.MAX_RETRIES} attempts`);
            }
        }
    }
}