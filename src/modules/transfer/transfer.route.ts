import { Context, Bot } from '../../types/context';
import { TransferController } from './transfer.controller';
import { Markup } from 'telegraf';

// Import TransferState interface
interface TransferState {
    step: 'currency' | 'amount' | 'wallet' | 'confirm' | 
          'offramp_quote' | 'offramp_signature' | 'offramp_wallet' | 
          'offramp_customer_name' | 'offramp_business_name' | 
          'offramp_email' | 'offramp_country' | 'offramp_confirm';
    data: {
        currency?: string;
        amount?: string;
        walletAddress?: string;
        purposeCode?: string;
        quotePayload?: string;
        quoteSignature?: string;
        preferredWalletId?: string;
        customerData?: {
            name: string;
            businessName: string;
            email: string;
            country: string;
        };
        preferredBankAccountId?: string;
    };
}

export class TransferRoute {
    private controller: TransferController;

    constructor(private bot: Bot) {
        this.controller = new TransferController();
        this.initializeRoutes();
    }

    // Fix: Remove async/await since getState is synchronous
    public getTransferState(ctx: Context): TransferState | undefined {
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('❌ No userId in getTransferState');
            return undefined;
        }
        
        // Remove await here
        const state = this.controller.getState(userId);
        console.log('📝 Retrieved transfer state:', {
            userId,
            hasState: !!state,
            step: state?.step,
            data: state?.data
        });
        return state;
    }

    // Add method to check if user has active transfer
    public hasActiveTransfer(userId: number): boolean {
        console.log('\n🔍 Checking transfer state');
        const state = this.controller.getState(userId);
        console.log('Current state:', {
            userId,
            hasState: !!state,
            step: state?.step,
            data: state?.data
        });
        const result = !!state;
        console.log('Has active transfer:', result);
        return result;
    }

    // Add method to handle text messages
    public async handleTextMessage(ctx: Context): Promise<void> {
        console.log('\n🔄 === TRANSFER ROUTE TEXT HANDLER ===');
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('❌ No userId found in text handler');
            return;
        }

        if (!ctx.message || !('text' in ctx.message)) {
            console.log('❌ Message is not a text message');
            return;
        }

        const messageText = ctx.message.text.trim();
        console.log('📩 Message received:', messageText);

        try {
            // Forward to controller's message handler
            await this.controller.handleMessage(ctx);
        } catch (error) {
            console.error('❌ Error in transfer flow:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
            this.controller.resetTransferState(userId);
        }
        console.log('=== TRANSFER ROUTE TEXT HANDLER END ===\n');
    }

    private initializeRoutes(): void {
        console.log('🚀 Initializing transfer routes');

        // Handle transfer menu callback
        this.bot.action('transfer_wallet', async (ctx) => {
            console.log('💰 Transfer to wallet selected');
            await this.controller.handleTransferStart(ctx);
        });

        // Handle text messages during transfer
        this.bot.on('text', async (ctx) => {
            const userId = ctx.from?.id;
            if (!userId) return;

            // Skip if message is a command
            if (ctx.message.text.startsWith('/')) return;

            // Forward to controller
            await this.controller.handleMessage(ctx);
        });

        // Add withdraw command
        this.bot.command('withdraw', async (ctx) => {
            await this.controller.handleTransferStart(ctx);
        });

        // Add offramp command
        this.bot.command('offramp', async (ctx) => {
            console.log('💱 Starting offramp flow');
            await this.controller.handleOfframpTransferStart(ctx);
        });

        // Add offramp action
        this.bot.action('offramp', async (ctx) => {
            console.log('💱 Offramp action triggered');
            await this.controller.handleOfframpTransferStart(ctx);
        });
    }
} 