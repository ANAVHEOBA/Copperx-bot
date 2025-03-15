import { Context, Bot } from '../../types/context';
import { KycController } from './kyc.controller';

export class KycRoute {
    private bot: Bot;
    private controller: KycController;

    constructor(bot: Bot) {
        this.bot = bot;
        this.controller = new KycController();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.bot.command('kyc_list', (ctx) => this.controller.handleKycList(ctx));
        this.bot.command('kyc_status', (ctx) => this.controller.handleKycStatus(ctx));
        this.bot.command('create_kyc', (ctx) => this.controller.handleCreateKyc(ctx));
        
        // Handle both document and photo uploads
        this.bot.on(['document', 'photo'], (ctx) => this.controller.handleCreateKyc(ctx));
        
        this.bot.command('help', (ctx) => this.handleHelp(ctx));
    }

    private async handleHelp(ctx: Context): Promise<void> {
        await ctx.reply(
            '🔐 *KYC Commands*\n\n' +
            '/kyc_list - View all KYC records\n' +
            '/kyc_status <id> - Check status of specific KYC\n' +
            '/create_kyc - Submit new KYC with PAN card\n' +
            '/help - Show this help message',
            { parse_mode: 'Markdown' }
        );
    }
} 