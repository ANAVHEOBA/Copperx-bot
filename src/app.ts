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
import express from 'express';
import type { Request, Response } from 'express';

export class App {
    private bot: Bot;
    private notificationsService: NotificationsService;
    private menuService!: MenuService;
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
        
        // Initialize NotificationsService
        this.notificationsService = new NotificationsService(this.bot);
        
        // Make it available in context
        this.bot.context.notificationsService = this.notificationsService;
        
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
        if (process.env.NODE_ENV === 'production') {
            console.log('Running in production mode on Render');
        }
        
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

        // Initialize MenuService before setting up handlers
        this.menuService = new MenuService(this.bot);

        // Setup base handlers
        this.setupBaseHandlers();

        // Fix the message type check
        this.bot.use(async (ctx, next) => {
            if ('message' in ctx.update && 'text' in ctx.update.message) {
                const text = ctx.update.message.text;
                // ... rest of the code
            }
            await next();
        });

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

        // Help command
        this.bot.command('help', async (ctx) => {
            console.log('❓ /help command received');
            try {
                await ctx.reply(
                    'Available commands:\n' +
                    '/start - Open main menu\n' +
                    '/help - Show this help message\n' +
                    '/wallet - Manage your wallet\n' +
                    '/transfer - Send funds\n' +
                    '/kyc - Verify your identity'
                );
                console.log('✅ Help command response sent');
            } catch (error) {
                console.error('❌ Error in help command:', error);
            }
        });

        // Text message handler
        this.bot.on('text', async (ctx, next) => {
            if (!ctx.message.text.startsWith('/')) {
                // Handle non-command text messages
                await this.menuService.handleNaturalLanguage(ctx, ctx.message.text);
            }
            return next();
        });

        // Make this the last handler
        this.bot.on('message', async (ctx) => {
            // Type guard for text messages
            if ('text' in ctx.message && ctx.message.text?.startsWith('/start')) {
                // Let MenuService handle /start command
                return;
            }
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
        console.log('\n🔧 Initializing modules');
        
        try {
            // Initialize NotificationsService first
            this.notificationsService = new NotificationsService(this.bot);
            
            // Fix AuthRoute initialization
            this.modules = [
                new AuthRoute(this.bot),
                new KycRoute(this.bot),
                new WalletRoute(this.bot)
            ];
            
            // Initialize transfer route
            this.transferRoute = new TransferRoute(this.bot);
            
            console.log('✅ All modules initialized');
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
            if (this.isShuttingDown) return;
            
            this.isShuttingDown = true;
            
            // Unsubscribe all notifications
            if (this.notificationsService) {
                // Add method to unsubscribe all
                await this.notificationsService.unsubscribeAll();
            }
            
            console.log('💾 Saving sessions...');
            this.saveSessions();
            
            console.log('🛑 Stopping bot...');
            await this.bot.stop();
            
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
            console.log('Environment:', process.env.NODE_ENV);
            console.log('Running on Render:', process.env.RENDER === 'true');
            
            if (process.env.RENDER === 'true') {
                const webhookDomain = process.env.RENDER_EXTERNAL_URL;
                const secretPath = '/webhook';
                
                if (!webhookDomain) {
                    throw new Error('RENDER_EXTERNAL_URL is required for webhook mode');
                }

                await this.bot.telegram.setWebhook(`${webhookDomain}${secretPath}`);
                console.log('Webhook set:', `${webhookDomain}${secretPath}`);

                const app = express();
                app.use(express.json());
                
                // Add proper types to request and response
                app.post(secretPath, (req: Request, res: Response) => {
                    this.bot.handleUpdate(req.body, res);
                });

                app.get('/', (req: Request, res: Response) => {
                    res.send('Bot is running');
                });

                const PORT = process.env.PORT || 3000;
                app.listen(PORT, () => {
                    console.log(`Server running on port ${PORT}`);
                });
            } else {
                await this.bot.telegram.deleteWebhook();
                await this.bot.launch();
                console.log('Bot started in polling mode');
            }

            const botInfo = await this.bot.telegram.getMe();
            console.log('✅ Bot info:', botInfo);
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            if (retryCount < this.MAX_RETRIES) {
                console.log(`Retrying in ${this.RETRY_DELAY/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.start(retryCount + 1);
            }
            throw new Error(`Failed to start bot after ${this.MAX_RETRIES} attempts`);
        }
    }
}