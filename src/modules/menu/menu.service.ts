import { Context, Bot } from '../../types/context';
import { Markup } from 'telegraf';
import { MENUS, NATURAL_LANGUAGE_PATTERNS, LOGIN_STATES } from './menu.config';
import { SessionManager } from '../../utils/session-manager';
import { AuthCrud } from '../auth/auth.crud';

export class MenuService {
    private userStates: Map<number, string> = new Map();
    private tempEmails: Map<number, string> = new Map();
    private tempSids: Map<number, string> = new Map();

    constructor(private bot: Bot) {
        this.initializeStartCommand();
        this.initializeMessageHandler();
        this.initializeCallbackHandler();
    }

    private initializeStartCommand(): void {
        this.bot.command('start', async (ctx) => {
            const isLoggedIn = await SessionManager.getToken(ctx);
            if (isLoggedIn) {
                await this.showMainMenu(ctx);
            } else {
                await this.showStartMenu(ctx);
            }
        });
    }

    private initializeMessageHandler(): void {
        this.bot.on('text', async (ctx) => {
            const userId = ctx.from?.id;
            if (!userId) return;

            const state = this.userStates.get(userId);
            
            if (state === LOGIN_STATES.WAITING_EMAIL) {
                await this.handleEmailInput(ctx);
            } else if (state === LOGIN_STATES.WAITING_OTP) {
                await this.handleOTPInput(ctx);
            }
        });
    }

    private initializeCallbackHandler(): void {
        this.bot.action('start_login', async (ctx) => {
            const userId = ctx.from?.id;
            if (!userId) return;

            await ctx.answerCbQuery();
            await this.startLoginFlow(ctx, userId);
        });

        this.bot.action(/^menu_.*$/, async (ctx) => {
            await this.handleMenuAction(ctx);
        });

        this.bot.action(/^(wallet|transfer|account|kyc)_.*$/, async (ctx) => {
            await this.handleSpecificAction(ctx, ctx.match[0]);
        });
    }

    private async showStartMenu(ctx: Context): Promise<void> {
        const keyboard = Markup.inlineKeyboard(
            this.createButtonRows(MENUS.START.options)
        );

        await ctx.reply(MENUS.START.title, keyboard);
    }

    public async showWelcomeMessage(ctx: Context): Promise<void> {
        await ctx.reply(
            '👋 Welcome to Copperx Bot!\n\n' +
            'I can help you manage your wallet, make transfers, and more.\n' +
            'Use the menu below to get started:'
        );
        // Automatically show main menu after welcome message
        await this.showMainMenu(ctx);
    }

    public async showMainMenu(ctx: Context): Promise<void> {
        const isLoggedIn = await SessionManager.getToken(ctx);
        if (!isLoggedIn) {
            await this.showStartMenu(ctx);
            return;
        }

        const keyboard = Markup.inlineKeyboard(
            this.createButtonRows(MENUS.MAIN.options)
        );

        await ctx.reply(MENUS.MAIN.title, keyboard);
    }

    public async handleMenuAction(ctx: Context): Promise<void> {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
        const action = ctx.callbackQuery.data;
        const userId = ctx.from?.id;
        if (!userId) return;

        await ctx.answerCbQuery(); // Always acknowledge the callback query first

        // Special handling for login and help
        if (action === 'start_login' || action === 'menu_help') {
            if (action === 'start_login') {
                await this.startLoginFlow(ctx, userId);
            } else {
                // Handle help menu
                await ctx.reply('Help information here...');
            }
            return;
        }

        // Check login status
        const isLoggedIn = await SessionManager.getToken(ctx);
        if (!isLoggedIn) {
            console.log('Session not found or expired, showing start menu');
            await this.showStartMenu(ctx);
            return;
        }

        // Handle back to main menu
        if (action === 'menu_main') {
            await this.showMainMenu(ctx);
            return;
        }

        // Handle other menu actions
        const menu = this.getMenuFromAction(action);
        if (menu) {
            const keyboard = Markup.inlineKeyboard(
                this.createButtonRows(menu.options)
            );
            await ctx.editMessageText(menu.title, keyboard);
        } else {
            await this.handleSpecificAction(ctx, action);
        }
    }

    private createButtonRows(options: Array<{ text: string; callback: string }>): any[][] {
        const buttons = options.map(option => 
            Markup.button.callback(option.text, option.callback)
        );
        
        // Create rows of 2 buttons each
        const rows: any[][] = [];
        for (let i = 0; i < buttons.length; i += 2) {
            rows.push(buttons.slice(i, i + 2));
        }
        return rows;
    }

    private async handleSpecificAction(ctx: Context, action: string): Promise<void> {
        // Check login status first
        const isLoggedIn = await SessionManager.getToken(ctx);
        if (!isLoggedIn) {
            await this.showStartMenu(ctx);
            return;
        }

        await ctx.answerCbQuery();
        
        switch (action) {
            case 'wallet_balance':
                await ctx.reply('📊 Fetching your balance...');
                break;
            case 'transfer_email':
                await ctx.reply('📧 Please enter recipient email and amount:\nFormat: email@example.com 100 USDC');
                break;
            case 'kyc_submit':
                await ctx.reply('📝 Please upload your identification document');
                break;
            // Add other specific actions
            default:
                await ctx.reply('🔄 Processing your request...');
        }
    }

    public async handleNaturalLanguage(ctx: Context, text: string): Promise<void> {
        for (const [intent, patterns] of Object.entries(NATURAL_LANGUAGE_PATTERNS)) {
            if (patterns.some(pattern => text.toLowerCase().includes(pattern))) {
                await this.handleIntent(ctx, intent);
                return;
            }
        }
    }

    private async handleIntent(ctx: Context, intent: string): Promise<void> {
        switch (intent) {
            case 'BALANCE':
                await ctx.reply('Showing balance menu...');
                // Handle balance intent
                break;
            case 'TRANSFER':
                await ctx.reply('Opening transfer menu...');
                // Handle transfer intent
                break;
            // Add other intents
        }
    }

    private getMenuFromAction(action: string): typeof MENUS[keyof typeof MENUS] | undefined {
        const menuKey = action.replace('menu_', '').toUpperCase();
        return MENUS[menuKey as keyof typeof MENUS];
    }

    private async startLoginFlow(ctx: Context, userId: number): Promise<void> {
        this.userStates.set(userId, LOGIN_STATES.WAITING_EMAIL);
        await ctx.reply(
            '📧 Please enter your email address:',
            Markup.forceReply()
        );
    }

    private async handleEmailInput(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const message = ctx.message as { text?: string };
        const email = message?.text;

        if (!email || !this.isValidEmail(email)) {
            await ctx.reply('❌ Please enter a valid email address');
            return;
        }

        try {
            const response = await AuthCrud.requestEmailOtp(email);
            
            this.tempEmails.set(userId, email);
            this.tempSids.set(userId, response.sid);
            this.userStates.set(userId, LOGIN_STATES.WAITING_OTP);

            await ctx.reply(
                '✅ Verification code sent!\n' +
                'Please enter the code you received:'
            );
        } catch (error) {
            await ctx.reply('❌ Failed to send verification code. Please try again.');
            this.userStates.set(userId, LOGIN_STATES.NONE);
        }
    }

    private async handleOTPInput(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const message = ctx.message as { text?: string };
        const otp = message?.text?.trim();
        const email = this.tempEmails.get(userId);
        const sid = this.tempSids.get(userId);

        if (!otp || !email || !sid) {
            await ctx.reply('❌ Something went wrong. Please start over.');
            this.resetUserState(userId);
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            await ctx.reply('❌ Please enter a valid 6-digit verification code.');
            return;
        }

        try {
            console.log('Verifying OTP with:', { email, otp, sid }); // Add logging
            const authResult = await AuthCrud.verifyOtp({
                email,
                otp,
                sid
            });
            
            try {
                await SessionManager.setToken(ctx, authResult.accessToken);
                this.resetUserState(userId);
                await ctx.reply('✅ Successfully logged in!');
                await this.showMainMenu(ctx);
            } catch (sessionError) {
                console.error('Session Error:', sessionError);
                await ctx.reply('❌ Login successful but failed to create session. Please try again.');
                this.resetUserState(userId);
            }
        } catch (error: any) {
            console.error('OTP Verification Error:', error);
            const errorMessage = error.message || 'Invalid verification code';
            await ctx.reply(`❌ Verification failed: ${errorMessage}`);
        }
    }

    private resetUserState(userId: number): void {
        this.userStates.delete(userId);
        this.tempEmails.delete(userId);
        this.tempSids.delete(userId);
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
} 