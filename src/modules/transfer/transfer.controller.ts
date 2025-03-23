import { Context } from '../../types/context';
import { TransferCrud } from './transfer.crud';
import { SessionManager } from '../../utils/session-manager';
import { TransferModel } from './transfer.model';
import { Message } from 'telegraf/typings/core/types/typegram';
import { 
    TransferRequest, 
    WalletWithdrawRequest, 
    OfframpRequest, 
    BatchTransferRequest, 
    BatchTransferRequestPayload, 
    TransferListParams,
    Transfer
} from './transfer.schema';
import { Markup } from 'telegraf';
import { sendMessageWithRetry } from '../../utils/telegram-helpers';

interface TransferState {
    step: 'currency' | 'amount' | 'wallet' | 'confirm';
    data: {
        currency?: string;
        amount?: string;
        walletAddress?: string;
        purposeCode?: string;
        recipientEmail?: string;
        email?: string;
    };
}

interface WalletBalance {
    symbol: string;
    balance: string;
    decimals: number;
    address: string;
}

interface Wallet {
    walletId: string;
    isDefault: boolean | null;
    network: string;
    balances: WalletBalance[];
}

export class TransferController {
    // Make transferStates static so it's shared across all instances
    private static transferStates: Map<number, TransferState> = new Map();

    public getState(userId: number): TransferState | undefined {
        const state = TransferController.transferStates.get(userId);
        console.log('🔍 Getting transfer state:', {
            userId,
            hasState: !!state,
            step: state?.step,
            data: state?.data
        });
        return state;
    }

    public resetTransferState(userId: number): void {
        TransferController.transferStates.delete(userId);
    }

    public setState(userId: number, state: TransferState): void {
        TransferController.transferStates.set(userId, {
            step: state.step,
            data: { ...state.data }
        });
    }

    async handleTransferStart(ctx: Context): Promise<void> {
        console.log('\n🚀 Starting transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        this.setState(userId, {
            step: 'currency',
            data: { purposeCode: 'self' }
        });

        await ctx.reply(
            '💱 Select currency to send:',
            Markup.keyboard([['USDC', 'USDT']])
                .oneTime()
                .resize()
        );
    }

    async handleMessage(ctx: Context): Promise<void> {
        console.log('\n📩 Handling transfer message');
        const userId = ctx.from?.id;
        if (!userId || !ctx.message || !('text' in ctx.message)) return;

        const state = this.getState(userId);
        console.log('Current transfer state:', state);

        if (!state) {
            console.log('No transfer state found');
            return;
        }

        try {
            switch (state.step) {
                case 'currency':
                    console.log('Handling currency input:', ctx.message.text);
                    await this.handleCurrency(ctx, ctx.message.text);
                    break;
                case 'amount':
                    console.log('Handling amount input:', ctx.message.text);
                    await this.handleAmount(ctx, ctx.message.text);
                    break;
                case 'wallet':
                    console.log('Handling wallet input:', ctx.message.text);
                    await this.handleWallet(ctx, ctx.message.text);
                    break;
                case 'confirm':
                    console.log('Handling confirmation:', ctx.message.text);
                    await this.handleConfirmation(ctx, ctx.message.text);
                    break;
                default:
                    console.log('Unknown step:', state.step);
                    await ctx.reply('❌ Invalid state. Please start over.');
                    this.resetTransferState(userId);
            }
        } catch (error) {
            console.error('Transfer error:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
            this.resetTransferState(userId);
        }
    }

    private async handleCurrency(ctx: Context, currency: string): Promise<void> {
        console.log('\n💱 === HANDLE CURRENCY START ===');
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('❌ No userId found');
            return;
        }

        try {
            const upperCurrency = currency.toUpperCase();
            if (!['USDC', 'USDT'].includes(upperCurrency)) {
                await sendMessageWithRetry(ctx, '❌ Please select either USDC or USDT');
                return;
            }

            console.log('Processing currency:', upperCurrency);
            
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await sendMessageWithRetry(ctx, '❌ Please login first');
                return;
            }

            const state = this.getState(userId);
            if (!state) {
                await sendMessageWithRetry(ctx, '❌ Transfer session expired. Please start over.');
                return;
            }

            this.setState(userId, {
                step: 'amount',
                data: {
                    ...state.data,
                    currency: upperCurrency
                }
            });

            await sendMessageWithRetry(
                ctx,
                `💰 Enter amount of ${upperCurrency} to send:`,
                Markup.removeKeyboard()
            );
            console.log('Amount prompt sent');

        } catch (error) {
            console.error('❌ Error handling currency:', error);
            try {
                await sendMessageWithRetry(
                    ctx, 
                    'Failed to process currency selection. Please try again.',
                    {},
                    5 // Increase max retries for error messages
                );
            } catch (retryError) {
                console.error('Failed to send error message:', retryError);
            }
            this.resetTransferState(userId);
        }
        console.log('=== HANDLE CURRENCY END ===\n');
    }

    private async handleAmount(ctx: Context, amount: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            await ctx.reply('❌ Please enter a valid positive number.');
            return;
        }

        const state = this.getState(userId);
        if (!state) return;

        this.setState(userId, {
            step: 'wallet',
            data: {
                ...state.data,
                amount
            }
        });

        await ctx.reply('👛 Enter the destination wallet address:');
    }

    private async handleWallet(ctx: Context, wallet: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        if (!this.isValidWalletAddress(wallet)) {
            await ctx.reply('❌ Invalid wallet address. Please enter a valid Ethereum address.');
            return;
        }

        const state = this.getState(userId);
        if (!state) return;

        this.setState(userId, {
            step: 'confirm',
            data: {
                ...state.data,
                walletAddress: wallet
            }
        });

        await ctx.reply(
            `🔍 Please confirm the transfer:\n\n` +
            `Amount: ${state.data.amount} ${state.data.currency}\n` +
            `To: ${wallet}\n\n` +
            `Reply with 'confirm' to proceed or 'cancel' to abort.`
        );
    }

    private async handleConfirmation(ctx: Context, response: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.getState(userId);
        if (!state?.data.currency || !state?.data.amount || !state?.data.walletAddress) {
            await ctx.reply('❌ Missing transfer information. Please start over.');
            this.resetTransferState(userId);
            return;
        }

        if (response.toLowerCase() === 'confirm') {
            try {
                const accessToken = await SessionManager.getToken(ctx);
                if (!accessToken) return;

                const transfer = await TransferCrud.sendTransfer(accessToken, {
                    amount: state.data.amount,
                    currency: state.data.currency,
                    walletAddress: state.data.walletAddress,
                    purposeCode: 'self'
                });

                const model = new TransferModel(transfer);
                await ctx.reply(model.getTransferInfo());
                this.resetTransferState(userId);
            } catch (error: any) {
                console.error('Transfer failed:', error);
                await ctx.reply(`❌ Transfer failed: ${error.message || 'Unknown error'}`);
                this.resetTransferState(userId);
            }
        } else if (response.toLowerCase() === 'cancel') {
            await ctx.reply('❌ Transfer cancelled.');
            this.resetTransferState(userId);
        } else {
            await ctx.reply('Please reply with "confirm" or "cancel"');
        }
    }

    private isValidWalletAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    private async checkAuth(ctx: Context): Promise<string | undefined> {
        const accessToken = await SessionManager.getToken(ctx);
        if (!accessToken) {
            await ctx.reply('❌ Please login first');
            return undefined;
        }
        return accessToken;
    }

    async handleBatchTransfer(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const message = ctx.message as Message.TextMessage;
            if (!message?.text) {
                await ctx.reply('Invalid command format');
                return;
            }

            const args = message.text.split(' ');
            if (args.length !== 4) {
                await ctx.reply('Usage: /send_batch <amount> <currency> <recipient1,recipient2,...>');
                return;
            }

            const [_, amount, currency, recipients] = args;
            const recipientList = recipients.split(',');

            const requests: BatchTransferRequest[] = recipientList.map((recipient, index) => ({
                requestId: `batch-${Date.now()}-${index}`,
                request: {
                    amount,
                    currency,
                    purposeCode: 'self',
                    ...(recipient.includes('@') ? { email: recipient } : { walletAddress: recipient })
                }
            }));

            const data: BatchTransferRequestPayload = { requests };
            const result = await TransferCrud.sendBatchTransfer(accessToken, data);

            await ctx.reply(
                TransferModel.getBatchTransferInfo(result.responses),
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Failed to send batch transfer:', error);
            await ctx.reply('❌ Failed to send batch transfer. Please try again.');
        }
    }

    async handleListTransfers(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const message = ctx.message as Message.TextMessage;
            const args = message.text.split(' ');
            const page = args[1] ? parseInt(args[1]) : 1;
            const limit = args[2] ? parseInt(args[2]) : 5;

            const params: TransferListParams = {
                page,
                limit,
                type: ['send', 'receive', 'withdraw']
            };

            const result = await TransferCrud.listTransfers(accessToken, params);
            let response = `📋 *Transfer List* (Page ${result.page})\n\n`;
            
            result.data.forEach(transfer => {
                const model = new TransferModel(transfer);
                response += model.getTransferSummary() + '\n\n';
            });

            response += `Showing ${result.data.length} of ${result.count} transfers\n`;
            if (result.hasMore) {
                response += `Use /list_transfers ${page + 1} to see more`;
            }

            await ctx.reply(response, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Failed to list transfers:', error);
            await ctx.reply('❌ Failed to list transfers. Please try again.');
        }
    }

    async handleTransferHelp(ctx: Context): Promise<void> {
        await ctx.reply(
            '💸 *Transfer Commands*\n\n' +
            '/send <amount> <currency> <email_or_wallet> - Send funds\n' +
            '/send_batch <amount> <currency> <recipient1,recipient2,...> - Send to multiple recipients\n' +
            '/withdraw <amount> <currency> <wallet_address> - Withdraw to wallet\n' +
            '/offramp <wallet_id> <quote_payload> <quote_signature> <customer_email> - Create offramp transfer\n' +
            '/list_transfers [page] [limit] - List your transfers\n' +
            '/transfer_help - Show this help message',
            { parse_mode: 'Markdown' }
        );
    }

    async handleEmailTransferStart(ctx: Context): Promise<void> {
        console.log('\n📧 Starting email transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        this.setState(userId, {
            step: 'currency',
            data: { purposeCode: 'email' }
        });

        await ctx.reply(
            '💱 Select currency to send:',
            Markup.keyboard([['USDC', 'USDT']])
                .oneTime()
                .resize()
        );
    }

    async handleWalletTransferStart(ctx: Context): Promise<void> {
        console.log('\n👛 Starting wallet transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        try {
            this.setState(userId, {
                step: 'currency',
                data: { purposeCode: 'wallet' }
            });

            await sendMessageWithRetry(
                ctx,
                '💱 Select currency to send:',
                Markup.keyboard([['USDC', 'USDT']])
                    .oneTime()
                    .resize()
            );
            console.log('Currency selection prompt sent');
        } catch (error) {
            console.error('❌ Error starting wallet transfer:', error);
            this.resetTransferState(userId);
            try {
                await sendMessageWithRetry(
                    ctx,
                    '❌ Failed to start transfer. Please try again.',
                    {},
                    5
                );
            } catch (retryError) {
                console.error('Failed to send error message:', retryError);
            }
        }
    }

    async handleBankTransferStart(ctx: Context): Promise<void> {
        console.log('\n🏦 Starting bank transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        this.setState(userId, {
            step: 'currency',
            data: { purposeCode: 'bank' }
        });

        await ctx.reply(
            '💱 Select currency to send:',
            Markup.keyboard([['USDC', 'USDT']])
                .oneTime()
                .resize()
        );
    }

    async handleBatchTransferStart(ctx: Context): Promise<void> {
        console.log('\n📤 Starting batch transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        this.setState(userId, {
            step: 'currency',
            data: { purposeCode: 'batch' }
        });

        await ctx.reply(
            '💱 Select currency to send:',
            Markup.keyboard([['USDC', 'USDT']])
                .oneTime()
                .resize()
        );
    }
}