import { Context, Bot } from '../../types/context';
import { Markup } from 'telegraf';
import { MENUS, NATURAL_LANGUAGE_PATTERNS } from './menu.config';

export class MenuService {
    constructor(private bot: Bot) {
        this.initializeStartCommand();
    }

    private initializeStartCommand(): void {
        this.bot.command('start', async (ctx) => {
            await this.showWelcomeMessage(ctx);
        });
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
        const keyboard = Markup.inlineKeyboard(
            this.createButtonRows(MENUS.MAIN.options)
        );

        await ctx.reply(MENUS.MAIN.title, keyboard);
    }

    public async handleMenuAction(ctx: Context): Promise<void> {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
        const action = ctx.callbackQuery.data;

        // Handle back to main menu
        if (action === 'menu_main') {
            await ctx.answerCbQuery();
            await this.showMainMenu(ctx);
            return;
        }

        const menu = this.getMenuFromAction(action);
        if (!menu) {
            await this.handleSpecificAction(ctx, action);
            return;
        }

        const keyboard = Markup.inlineKeyboard(
            this.createButtonRows(menu.options)
        );

        await ctx.answerCbQuery();
        await ctx.editMessageText(menu.title, keyboard);
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
} 