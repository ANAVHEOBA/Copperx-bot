import { Context, Bot } from '../../types/context';
import { TransferController } from './transfer.controller';

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

    // Add method to check if user has active transfer
    public hasActiveTransfer(userId: number): boolean {
        const state = this.controller.getState(userId);
        console.log('🔍 Checking active transfer:', {
            userId,
            hasState: !!state,
            state
        });
        return !!state;
    }

    // Add method to handle text messages
    public async handleTextMessage(ctx: Context): Promise<void> {
        console.log('\n🔄 === TRANSFER ROUTE TEXT HANDLER ===');
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('❌ No userId found in text handler');
            return;
        }

        // Type guard for text message
        if (!ctx.message || !('text' in ctx.message)) {
            console.log('❌ Message is not a text message');
            return;
        }

        const state = this.controller.getState(userId);
        const messageText = ctx.message.text;
        
        console.log('📩 Message details:', {
            text: messageText,
            from: userId,
            username: ctx.from?.username,
            messageId: ctx.message.message_id
        });
        console.log('🔄 Current transfer state:', state);

        if (state) {
            try {
                console.log(`⚡ Processing step: ${state.step}`);
                switch (state.step) {
                    case 'currency':
                        console.log('💱 Handling currency selection:', messageText);
                        await this.controller.handleCurrencySelection(ctx);
                        break;
                    case 'amount':
                        console.log('👉 Handling amount input:', messageText);
                        await this.controller.handleAmountInput(ctx);
                        break;
                    case 'email':
                        console.log('👉 Handling email input:', messageText);
                        await this.controller.handleEmailInput(ctx);
                        break;
                    case 'preview':
                        console.log('👉 Handling preview action:', messageText);
                        if (messageText.toLowerCase() === 'confirm') {
                            await this.controller.handleTransferConfirmation(ctx);
                        } else if (messageText.toLowerCase() === 'cancel') {
                            await this.controller.handleTransferCancellation(ctx);
                        }
                        break;
                    default:
                        console.log('❌ Unknown transfer step:', state.step);
                }
            } catch (error) {
                console.error('❌ Error in transfer flow:', error);
                console.error(error); // Log the full error
                await ctx.reply('❌ An error occurred. Please try again.');
                this.controller.resetTransferState(userId);
            }
        } else {
            console.log('❌ No active transfer state found');
        }
        console.log('=== TRANSFER ROUTE TEXT HANDLER END ===\n');
    }

    private initializeRoutes(): void {
        // Command handlers
        this.bot.command('send', (ctx) => this.controller.handleSendTransfer(ctx));
        this.bot.command('send_batch', (ctx) => this.controller.handleBatchTransfer(ctx));
        this.bot.command('withdraw', (ctx) => this.controller.handleWalletWithdraw(ctx));
        this.bot.command('offramp', (ctx) => this.controller.handleOfframp(ctx));
        this.bot.command('list_transfers', (ctx) => this.controller.handleListTransfers(ctx));
        this.bot.command('transfer_help', (ctx) => this.controller.handleTransferHelp(ctx));

        // Action handlers
        this.bot.action('transfer_email', async (ctx) => {
            await ctx.answerCbQuery();
            await this.controller.handleEmailTransferStart(ctx);
        });

        this.bot.action('transfer_confirm', async (ctx) => {
            await ctx.answerCbQuery();
            await this.controller.handleTransferConfirmation(ctx);
        });

        this.bot.action('transfer_cancel', async (ctx) => {
            await ctx.answerCbQuery();
            await this.controller.handleTransferCancellation(ctx);
        });
    }

    private async getTransferState(ctx: Context): Promise<TransferState | undefined> {
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('No userId in getTransferState'); // Debug log
            return undefined;
        }
        const state = await this.controller.getState(userId);
        console.log('Retrieved state:', state); // Debug log
        return state;
    }
} 