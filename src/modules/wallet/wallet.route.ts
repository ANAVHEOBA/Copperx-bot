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
        this.bot.command('all_balances', (ctx) => this.controller.handleAllWalletBalances(ctx));
        this.bot.action('menu_wallet', async (ctx) => {
            await this.menuService.handleMenuAction(ctx);
        });
        this.bot.action(/^wallet_.*/, async (ctx) => {
            await this.handleWalletAction(ctx);
        });
        this.bot.action('wallet_token_balance', (ctx) => this.controller.handleTokenBalanceMenu(ctx));
        this.bot.action(/^token_balance_network:(.+)$/, (ctx) => {
            const network = ctx.match[1];
            return this.controller.handleTokenBalanceNetworkSelected(ctx, network);
        });
        this.bot.on('text', async (ctx) => {
            if (ctx.session?.selectedNetwork) {
                await this.controller.handleTokenBalance(ctx, ctx.message.text);
                return;
            }
            await this.menuService.handleNaturalLanguage(ctx, ctx.message.text);
        });
    }

    private async handleWalletAction(ctx: Context): Promise<void> {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
        const action = ctx.callbackQuery.data;

        try {
            await ctx.answerCbQuery();

            switch (action) {
                case 'wallet_balance':
                    await this.controller.handleWalletBalance(ctx);
                    break;
                case 'wallet_all_balances':
                    await this.controller.handleAllWalletBalances(ctx);
                    break;
                case 'wallet_history':
                    await this.controller.handleWalletList(ctx);
                    break;
                case 'wallet_set_default':
                    await this.controller.handleSetDefaultWallet(ctx);
                    break;
                case 'wallet_token_balance':
                    await this.controller.handleTokenBalanceMenu(ctx);
                    break;
                default:
                    await ctx.editMessageText('⚠️ Invalid wallet action requested');
            }
        } catch (error: any) {
            console.error('Wallet action error:', error);
            if (!error.description?.includes('message is not modified')) {
                await ctx.reply('❌ An error occurred. Please try again.');
            }
        }
    }
} 