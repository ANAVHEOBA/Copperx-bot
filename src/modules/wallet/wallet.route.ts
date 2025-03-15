import { Context, Bot } from '../../types/context';
import { WalletController } from './wallet.controller';

export class WalletRoute {
    private bot: Bot;
    private controller: WalletController;

    constructor(bot: Bot) {
        this.bot = bot;
        this.controller = new WalletController();
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
    }
} 