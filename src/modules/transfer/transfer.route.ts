import { Context, Bot } from '../../types/context';
import { TransferController } from './transfer.controller';
import { Markup } from 'telegraf';

// Import TransferState interface
interface TransferState {
    step: 'currency' | 'amount' | 'email' | 'preview';
    data: {
        currency?: string;
        amount?: string;
        email?: string;
        purposeCode?: string;
    };
}

export class TransferRoute {
    private bot: Bot;
    private controller: TransferController;

    constructor(bot: Bot) {
        this.bot = bot;
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
        console.log('\n🎯 === INITIALIZING TRANSFER ROUTES - START ===');
        
        // Register text handler first
        this.bot.on('text', async (ctx) => {
            console.log('\n💬 === TRANSFER TEXT HANDLER ===');
            console.log('Message received:', {
                text: ctx.message.text,
                from: ctx.from?.id,
                chat: ctx.chat?.id
            });
            
            try {
                const text = ctx.message.text.trim();
                
                // Skip commands
                if (text.startsWith('/')) {
                    console.log('⏭️ Skipping command:', text);
                    return;
                }

                const parts = text.split(' ');
                console.log('Message parts:', parts);

                if (parts.length === 3) {
                    console.log('🎯 Transfer pattern detected, parts:', parts);
                    await this.controller.handleWalletTransferCommand(ctx, text);
                } else {
                    console.log('📝 Not a transfer pattern, parts length:', parts.length);
                    await ctx.reply('Invalid transfer format. Use: <amount> <currency> <address>');
                }
            } catch (error) {
                console.error('❌ Error in transfer handler:', error);
                console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
                await ctx.reply('An error occurred. Please try again.');
            }
        });

        // Register command handlers
        this.bot.command('withdraw', ctx => {
            console.log('💰 Withdraw command received');
            ctx.reply('Please enter amount, currency and address (e.g., "100 USDC 0x1234...")');
        });

        console.log('✅ Transfer routes initialized');
    }
} 