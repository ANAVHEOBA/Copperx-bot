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
    private isShuttingDown: boolean = false;
    private readonly SESSION_FILE = path.join(__dirname, '../.sessions.json');
    private sessions: { [key: string]: SessionData } = {};

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
        // Add persistent session storage
        this.bot.use(session({
            defaultSession: (): SessionData => ({
                accessToken: undefined,
                tokenTimestamp: undefined
            }),
            store: {
                get: (key: string) => {
                    console.log('Getting session for key:', key);
                    const session = this.sessions[key];
                    if (CONFIG.APP.DEBUG) {
                        console.log('Retrieved session:', session);
                    }
                    return session;
                },
                set: (key: string, value: SessionData) => {
                    console.log('Setting session for key:', key);
                    if (CONFIG.APP.DEBUG) {
                        console.log('Setting session value:', value);
                    }
                    this.sessions[key] = value;
                    this.saveSessions();
                },
                delete: (key: string) => {
                    console.log('Deleting session for key:', key);
                    delete this.sessions[key];
                    this.saveSessions();
                }
            }
        }));

        // Add logging middleware
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id;
            console.log(`Session state for user ${userId}:`, ctx.session);
            await next();
        });
    }

    private initializeModules(): void {
        new AuthRoute(this.bot);
        new KycRoute(this.bot);
        new WalletRoute(this.bot);
        new TransferRoute(this.bot);
        
        // Initialize menu system
        this.bot.command('menu', (ctx) => this.menuService.showMainMenu(ctx));
        this.bot.command('start', (ctx) => this.menuService.showWelcomeMessage(ctx));
        
        // Handle menu actions
        this.bot.action(/^menu_.*/, (ctx) => this.menuService.handleMenuAction(ctx));
        this.bot.action(/^(wallet|transfer|kyc|account)_.*/, (ctx) => {
            this.menuService.handleMenuAction(ctx);
        });
        
        // Handle text messages
        this.bot.on('text', (ctx) => {
            if (ctx.message && 'text' in ctx.message) {
                this.menuService.handleNaturalLanguage(ctx, ctx.message.text);
            }
        });
    }

    private setupShutdown(): void {
        const cleanup = async () => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;
            
            console.log('Saving sessions before shutdown...');
            this.saveSessions();
            
            console.log('Shutting down bot...');
            await this.bot.stop();
            process.exit(0);
        };

        process.once('SIGINT', cleanup);
        process.once('SIGTERM', cleanup);
        process.once('SIGUSR2', cleanup);
    }

    public async start(): Promise<void> {
        try {
            await this.bot.launch();
            console.log('🤖 Telegram bot is running...');
        } catch (error) {
            console.error('Failed to start bot:', error);
            process.exit(1);
        }
    }
}