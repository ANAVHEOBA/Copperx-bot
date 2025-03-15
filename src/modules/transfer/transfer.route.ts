import { Context, Bot } from '../../types/context';
import { TransferController } from './transfer.controller';

export class TransferRoute {
    private bot: Bot;
    private controller: TransferController;

    constructor(bot: Bot) {
        this.bot = bot;
        this.controller = new TransferController();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.bot.command('send', (ctx) => this.controller.handleSendTransfer(ctx));
        this.bot.command('send_batch', (ctx) => this.controller.handleBatchTransfer(ctx));
        this.bot.command('withdraw', (ctx) => this.controller.handleWalletWithdraw(ctx));
        this.bot.command('offramp', (ctx) => this.controller.handleOfframp(ctx));
        this.bot.command('list_transfers', (ctx) => this.controller.handleListTransfers(ctx));
        this.bot.command('transfer_help', (ctx) => this.controller.handleTransferHelp(ctx));
        this.bot.hears(['confirm', 'cancel'], (ctx) => this.controller.handleTransferConfirmation(ctx));
    }
} 