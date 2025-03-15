import { Context, Bot } from '../../types/context';
import { WalletController } from './wallet.controller';
import { MenuService } from '../menu/menu.service';
import { CallbackQuery } from 'telegraf/types';

export class WalletRoute {
    private bot: Bot;
    private controller: WalletController;
    private menuService: MenuService;

    constructor(bot: Bot) {
        this.bot = bot;
        this.controller = new WalletController();
        this.menuService = new MenuService(bot);
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.bot.command('wallets', (ctx) => this.controller.handleWalletList(ctx));
        this.bot.command('balance', (ctx) => this.controller.handleWalletBalance(ctx));
        this.bot.command('default_wallet', (ctx) => this.controller.handleGetDefaultWallet(ctx));
        this.bot.command('set_default', (ctx) => this.controller.handleSetDefaultWallet(ctx));
        this.bot.action(/^set_default:/, (ctx) => this.controller.handleSetDefaultCallback(ctx));
        this.bot.command('wallet_help', (ctx) => this.controller.handleWalletHelp(ctx));
        this.bot.command('networks', (ctx) => this.controller.handleNetworks(ctx));
        this.bot.command('token_balance', (ctx) => this.controller.handleTokenBalance(ctx));
        this.bot.command('recover_tokens', (ctx) => this.controller.handleRecoverTokens(ctx));
        this.bot.action('menu_wallet', async (ctx) => {
            await this.menuService.handleMenuAction(ctx);
        });
        this.bot.action(/^wallet_.*/, async (ctx) => {
            await this.handleWalletAction(ctx);
        });
        this.bot.on('text', async (ctx) => {
            await this.menuService.handleNaturalLanguage(ctx, ctx.message.text);
        });
    }

    private async handleWalletAction(ctx: Context): Promise<void> {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
        const action = ctx.callbackQuery.data;

        switch (action) {
            case 'wallet_balance':
                await this.controller.handleWalletBalance(ctx);
                break;
            case 'wallet_history':
                await this.controller.handleWalletList(ctx);
                break;
            // Add other wallet actions
        }
    }
} 