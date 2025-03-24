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
    Transfer,
    TransferState
} from './transfer.schema';
import { Markup } from 'telegraf';
import { sendMessageWithRetry } from '../../utils/telegram-helpers';
import axios from 'axios';

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
                    await this.handleCurrency(ctx, ctx.message.text);
                    break;
                case 'amount':
                    await this.handleAmount(ctx, ctx.message.text);
                    break;
                case 'wallet':
                    await this.handleWallet(ctx, ctx.message.text);
                    break;
                case 'confirm':
                    await this.handleConfirmation(ctx, ctx.message.text);
                    break;
                case 'offramp_quote':
                case 'offramp_signature':
                case 'offramp_wallet':
                case 'offramp_customer_name':
                case 'offramp_business_name':
                case 'offramp_email':
                case 'offramp_country':
                case 'offramp_confirm':
                    await this.handleOfframpFlow(ctx, ctx.message.text);
                    break;
                case 'batch_currency':
                case 'batch_amount':
                case 'batch_recipients':
                case 'batch_confirm':
                    await this.handleBatchTransferFlow(ctx, ctx.message.text);
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

    private async handleAmount(ctx: Context, text: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.getState(userId);
        if (!state) return;

        const amount = text.trim();
        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            await ctx.reply('Please enter a valid positive number');
            return;
        }

        // Check if this is an offramp transfer
        if (state.data.purposeCode === 'offramp') {
            try {
                const accessToken = await SessionManager.getToken(ctx);
                if (!accessToken) return;

                // Convert the amount to base units (e.g., 1 USDC -> 1000000000)
                const baseAmount = TransferModel.convertToBaseUnit(amount, state.data.currency!);
                console.log('🔄 Getting quote for amount:', amount, '(base units:', baseAmount, ')');

                const quote = await TransferCrud.getOfframpQuote(accessToken, {
                    amount: baseAmount,
                    currency: state.data.currency!,
                    destinationCurrency: 'USD',
                    sourceCountry: 'none',
                    destinationCountry: 'none',
                    onlyRemittance: true,
                    preferredBankAccountId: state.data.preferredBankAccountId
                });

                if (!quote.payload || !quote.signature) {
                    throw new Error('Invalid quote response');
                }

                this.setState(userId, {
                    step: 'offramp_wallet',
                    data: {
                        ...state.data,
                        amount: baseAmount,  // Store the base unit amount
                        quotePayload: quote.payload,
                        quoteSignature: quote.signature
                    }
                });

                // Use TransferModel to format the quote details
                await ctx.reply(
                    TransferModel.formatQuoteDetails(quote),
                    {
                        parse_mode: 'Markdown',
                        ...Markup.keyboard([['Cancel']])
                            .oneTime()
                            .resize()
                    }
                );
            } catch (error: any) {
                console.error('Error getting quote:', error);
                
                let errorMessage = '❌ Failed to get quote.';
                
                // Check for KYC/B error
                if (error?.data?.error === 'KYC/B is not approved' || 
                    error?.message === 'KYC/B is not approved') {
                    errorMessage = `❌ *KYC Verification Required*\n\n` +
                        `To proceed with offramp transfers, you need to:\n\n` +
                        `1️⃣ Complete KYC verification\n` +
                        `2️⃣ Wait for approval\n` +
                        `3️⃣ Try again once approved\n\n` +
                        `Please contact support for assistance with KYC verification.`;
                } else if (error?.message) {
                    errorMessage = `❌ ${error.message}`;
                }
                
                await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
                this.resetTransferState(userId);
            }
        } else {
            // Regular transfer flow
            this.setState(userId, {
                step: 'wallet',
                data: {
                    ...state.data,
                    amount
                }
            });
            await ctx.reply('👛 Enter the destination wallet address:');
        }
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

                // Convert amount to base units before sending
                const baseAmount = TransferModel.convertToBaseUnit(
                    state.data.amount,
                    state.data.currency
                );

                const transfer = await TransferCrud.sendTransfer(accessToken, {
                    amount: baseAmount, // Use converted amount
                    currency: state.data.currency,
                    walletAddress: state.data.walletAddress,
                    purposeCode: state.data.purposeCode || 'self'
                });

                const model = new TransferModel(transfer);
                await ctx.reply(model.getTransferInfo(), { parse_mode: 'Markdown' });
                this.resetTransferState(userId);
            } catch (error: any) {
                console.error('Transfer failed:', error);
                let errorMessage = '❌ Transfer failed: ';
                
                if (error.message && Array.isArray(error.message)) {
                    // Handle validation errors
                    const validationErrors = error.message
                        .map((err: any) => {
                            const constraints = err.constraints ? Object.values(err.constraints).join(', ') : '';
                            return `${err.property}: ${constraints}`;
                        })
                        .join('\n');
                    errorMessage += `\n${validationErrors}`;
                } else {
                    errorMessage += error.message || 'Unknown error';
                }
                
                await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
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

    async handleListTransfers(ctx: Context, page: number = 1): Promise<void> {
        let loadingMessage: Message.TextMessage | undefined;
        
        try {
            // Get access token from session
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('❌ Please login first using /start');
                return;
            }

            // Show loading message
            if ('callback_query' in ctx.update) {
                await ctx.editMessageText('📋 Fetching transfers...');
            } else {
                loadingMessage = await ctx.reply('📋 Fetching transfers...') as Message.TextMessage;
            }

            // Default parameters
            const limit = 5;
            const params: TransferListParams = {
                page,
                limit,
                type: ['send', 'receive', 'withdraw', 'deposit']
            };

            console.log('Fetching transfers with params:', params);
            const result = await TransferCrud.listTransfers(accessToken, params);
            console.log('Transfers response:', result);

            let response = `📋 *Transfer List* (Page ${result.page})\n\n`;
            
            if (!result.data || result.data.length === 0) {
                response += 'No transfers found.';
            } else {
                result.data.forEach(transfer => {
                    const model = new TransferModel(transfer);
                    response += model.getTransferSummary() + '\n\n';
                });

                response += `Showing ${result.data.length} of ${result.count} transfers\n`;
            }

            // Create pagination buttons
            const buttons = [];
            if (page > 1) {
                buttons.push(Markup.button.callback('⬅️ Previous', `transfer_list_${page - 1}`));
            }
            if (result.hasMore) {
                buttons.push(Markup.button.callback('➡️ Next', `transfer_list_${page + 1}`));
            }
            buttons.push(Markup.button.callback('🔄 Refresh', `transfer_list_${page}`));
            buttons.push(Markup.button.callback('⬅️ Back', 'menu_transfer'));

            const markup = Markup.inlineKeyboard([buttons]);

            // Update or send new message
            if ('callback_query' in ctx.update) {
                await ctx.editMessageText(response, { 
                    parse_mode: 'Markdown',
                    reply_markup: markup.reply_markup
                });
            } else {
                // Clean up loading message if it exists
                if (loadingMessage?.message_id) {
                    try {
                        await ctx.deleteMessage(loadingMessage.message_id);
                    } catch (error) {
                        console.log('Could not delete loading message:', error);
                    }
                }
                
                await ctx.reply(response, { 
                    parse_mode: 'Markdown',
                    reply_markup: markup.reply_markup
                });
            }

        } catch (error) {
            console.error('Failed to list transfers:', error);
            const errorMessage = '❌ Failed to fetch transfers. Please try again.';
            
            if ('callback_query' in ctx.update) {
                await ctx.editMessageText(errorMessage);
            } else {
                // Clean up loading message in case of error
                if (loadingMessage?.message_id) {
                    try {
                        await ctx.deleteMessage(loadingMessage.message_id);
                    } catch (err) {
                        console.log('Could not delete loading message:', err);
                    }
                }
                await ctx.reply(errorMessage);
            }
        }
    }

    // Add this method to handle pagination callbacks
    async handleTransferListCallback(ctx: Context, action: string): Promise<void> {
        const match = action.match(/^transfer_list_(\d+)$/);
        if (!match) return;

        const page = parseInt(match[1]);
        await this.handleListTransfers(ctx, page);
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
            data: { purposeCode: 'self' }
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
        const userId = ctx.from?.id;
        if (!userId) return;

        this.setState(userId, {
            step: 'batch_currency',
            data: {}
        });

        await ctx.reply(
            '💱 *Batch Transfer*\n\n' +
            'Please select the currency you want to send:',
            {
                parse_mode: 'Markdown',
                ...Markup.keyboard([['USDC', 'USDT'], ['Cancel']])
                    .oneTime()
                    .resize()
            }
        );
    }

    async handleOfframpTransferStart(ctx: Context): Promise<void> {
        console.log('\n💱 Starting offramp transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            this.setState(userId, {
                step: 'currency',
                data: { purposeCode: 'offramp' }
            });

            await ctx.reply(
                '💱 *Offramp Transfer*\n\n' +
                'Please select the currency you want to convert:',
                {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([['USDC', 'USDT']])
                        .oneTime()
                        .resize()
                }
            );
        } catch (error) {
            console.error('❌ Error starting offramp transfer:', error);
            await ctx.reply('Failed to start offramp transfer. Please try again.');
        }
    }

    private async handleOfframpFlow(ctx: Context, text: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.getState(userId);
        if (!state) return;

        try {
            switch (state.step) {
                case 'currency':
                    if (!['USDC', 'USDT'].includes(text.toUpperCase())) {
                        await ctx.reply('Please select a valid currency (USDC or USDT)');
                        return;
                    }
                    this.setState(userId, {
                        step: 'amount',
                        data: { ...state.data, currency: text.toUpperCase() }
                    });
                    await ctx.reply('Enter the amount you want to convert:');
                    break;

                case 'amount':
                    const amount = text.trim();
                    if (isNaN(Number(amount)) || Number(amount) <= 0) {
                        await ctx.reply('Please enter a valid positive number');
                        return;
                    }

                    // Get quote from API
                    const accessToken = await SessionManager.getToken(ctx);
                    if (!accessToken) return;

                    try {
                        const quote = await TransferCrud.getOfframpQuote(accessToken, {
                            amount: TransferModel.convertToBaseUnit(amount, state.data.currency!),
                            currency: state.data.currency!,
                            destinationCurrency: 'USD',
                            sourceCountry: 'none',
                            destinationCountry: 'none',
                            onlyRemittance: true,
                            preferredBankAccountId: state.data.preferredBankAccountId
                        });

                        this.setState(userId, {
                            step: 'offramp_wallet',
                            data: {
                                ...state.data,
                                amount,
                                quotePayload: quote.payload,
                                quoteSignature: quote.signature
                            }
                        });

                        await ctx.reply(
                            '💱 *Quote Details*\n\n' +
                            `Amount: ${quote.amount} ${quote.currency}\n` +
                            `You'll receive: ${quote.destinationAmount} ${quote.destinationCurrency}\n` +
                            `Rate: ${quote.rate}\n` +
                            `Fee: ${quote.fee.amount} ${quote.fee.currency}\n` +
                            `Expires: ${new Date(quote.expiresAt).toLocaleString()}\n\n` +
                            'Please enter your wallet ID:',
                            {
                                parse_mode: 'Markdown',
                                ...Markup.keyboard([['Cancel']])
                                    .oneTime()
                                    .resize()
                            }
                        );
                    } catch (error: any) {
                        console.error('Error getting quote:', error);
                        
                        let errorMessage = '❌ Failed to get quote.';
                        
                        if (error?.data?.error === 'KYC/B is not approved' || 
                            error?.message === 'KYC/B is not approved') {
                            errorMessage = `❌ *KYC Verification Required*\n\n` +
                                `To proceed with offramp transfers, you need to:\n\n` +
                                `1️⃣ Complete KYC verification\n` +
                                `2️⃣ Wait for approval\n` +
                                `3️⃣ Try again once approved\n\n` +
                                `Please contact support for assistance with KYC verification.`;
                        } else if (error?.message) {
                            errorMessage = `❌ ${error.message}`;
                        }
                        
                        await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
                        this.resetTransferState(userId);
                        return;
                    }
                    break;

                case 'offramp_wallet':
                    this.setState(userId, {
                        step: 'offramp_customer_name',
                        data: {
                            ...state.data,
                            preferredWalletId: text,
                            customerData: {
                                name: '',
                                businessName: '',
                                email: '',
                                country: ''
                            }
                        }
                    });
                    await ctx.reply('Please enter your full name:');
                    break;

                case 'offramp_customer_name':
                    this.setState(userId, {
                        step: 'offramp_business_name',
                        data: {
                            ...state.data,
                            customerData: {
                                ...state.data.customerData!,
                                name: text
                            }
                        }
                    });
                    await ctx.reply('Please enter your business name:');
                    break;

                case 'offramp_business_name':
                    this.setState(userId, {
                        step: 'offramp_email',
                        data: {
                            ...state.data,
                            customerData: {
                                ...state.data.customerData!,
                                businessName: text
                            }
                        }
                    });
                    await ctx.reply('Please enter your email address:');
                    break;

                case 'offramp_email':
                    if (!this.isValidEmail(text)) {
                        await ctx.reply('Please enter a valid email address');
                        return;
                    }
                    this.setState(userId, {
                        step: 'offramp_country',
                        data: {
                            ...state.data,
                            customerData: {
                                ...state.data.customerData!,
                                email: text
                            }
                        }
                    });
                    await ctx.reply('Please enter your country code (e.g., US):');
                    break;

                case 'offramp_country':
                    this.setState(userId, {
                        step: 'offramp_confirm',
                        data: {
                            ...state.data,
                            customerData: {
                                ...state.data.customerData!,
                                country: text.toUpperCase()
                            }
                        }
                    });

                    await ctx.reply(
                        '📝 *Please confirm your offramp transfer details:*\n\n' +
                        `Name: ${state.data.customerData!.name}\n` +
                        `Business: ${state.data.customerData!.businessName}\n` +
                        `Email: ${state.data.customerData!.email}\n` +
                        `Country: ${text.toUpperCase()}\n` +
                        `Wallet ID: ${state.data.preferredWalletId}\n\n` +
                        'Type "confirm" to proceed or "cancel" to abort.',
                        {
                            parse_mode: 'Markdown',
                            ...Markup.keyboard([['Confirm', 'Cancel']])
                                .oneTime()
                                .resize()
                        }
                    );
                    break;

                case 'offramp_confirm':
                    if (text.toLowerCase() === 'confirm') {
                        await this.processOfframpTransfer(ctx);
                    } else if (text.toLowerCase() === 'cancel') {
                        await ctx.reply('❌ Offramp transfer cancelled.');
                        this.resetTransferState(userId);
                    } else {
                        await ctx.reply('Please type "confirm" or "cancel"');
                    }
                    break;
            }
        } catch (error) {
            console.error('Error in offramp flow:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
            this.resetTransferState(userId);
        }
    }

    private async processOfframpTransfer(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.getState(userId);
        if (!state) return;

        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) return;

            // Create offramp request
            const offrampRequest: OfframpRequest = {
                quotePayload: state.data.quotePayload!,
                quoteSignature: state.data.quoteSignature!,
                preferredWalletId: state.data.preferredWalletId!,
                purposeCode: 'self',
                sourceOfFunds: 'salary',
                recipientRelationship: 'self',
                customerData: state.data.customerData!,
                // Optional fields
                note: `Offramp transfer created via bot at ${new Date().toISOString()}`,
                invoiceNumber: undefined, // Add if needed
                invoiceUrl: undefined, // Add if needed
                sourceOfFundsFile: undefined // Add if needed
            };

            // Show processing message
            await ctx.reply('⏳ Processing your offramp transfer...');

            // Create the transfer
            const transfer = await TransferCrud.createOfframp(accessToken, offrampRequest);
            
            // Format and show success message
            const model = new TransferModel(transfer);
            await ctx.reply(
                '✅ Offramp transfer created successfully!\n\n' + 
                model.getTransferInfo(),
                { parse_mode: 'Markdown' }
            );

            // Reset state
            this.resetTransferState(userId);
        } catch (error: any) {
            console.error('Error processing offramp:', error);
            
            // Enhanced error handling
            let errorMessage = '❌ Failed to create offramp transfer.';
            if (error.message) {
                if (typeof error.message === 'string') {
                    errorMessage += `\n\nReason: ${error.message}`;
                } else if (typeof error.message === 'object') {
                    errorMessage += `\n\nReason: ${JSON.stringify(error.message)}`;
                }
            }
            
            await ctx.reply(errorMessage);
            this.resetTransferState(userId);
        }
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    private async handleBatchTransferFlow(ctx: Context, text: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.getState(userId);
        if (!state) return;

        try {
            switch (state.step) {
                case 'batch_currency':
                    if (!['USDC', 'USDT'].includes(text.toUpperCase())) {
                        await ctx.reply('Please select a valid currency (USDC or USDT)');
                        return;
                    }

                    this.setState(userId, {
                        step: 'batch_amount',
                        data: { ...state.data, currency: text.toUpperCase() }
                    });

                    await ctx.reply(
                        '💰 Enter the amount to send to each recipient:',
                        Markup.keyboard([['Cancel']])
                            .oneTime()
                            .resize()
                    );
                    break;

                case 'batch_amount':
                    const amount = text.trim();
                    if (isNaN(Number(amount)) || Number(amount) <= 0) {
                        await ctx.reply('Please enter a valid positive number');
                        return;
                    }

                    this.setState(userId, {
                        step: 'batch_recipients',
                        data: { ...state.data, amount }
                    });

                    await ctx.reply(
                        '📧 Enter recipient addresses or emails\n\n' +
                        'You can enter multiple recipients, one per line:\n' +
                        'Example:\n' +
                        'user1@email.com\n' +
                        '0x123...def\n' +
                        'user2@email.com\n\n' +
                        '_Send the message when you\'re done._',
                        {
                            parse_mode: 'Markdown',
                            ...Markup.keyboard([['Cancel']])
                                .oneTime()
                                .resize()
                        }
                    );
                    break;

                case 'batch_recipients':
                    const recipients = text.split('\n')
                        .map(r => r.trim())
                        .filter(r => r.length > 0);

                    if (recipients.length === 0) {
                        await ctx.reply('Please enter at least one recipient');
                        return;
                    }

                    const batchTransfers = recipients.map(recipient => ({
                        ...(recipient.includes('@') 
                            ? { email: recipient } 
                            : { walletAddress: recipient }),
                        amount: state.data.amount!,
                        currency: state.data.currency!
                    }));

                    this.setState(userId, {
                        step: 'batch_confirm',
                        data: { 
                            ...state.data, 
                            recipients,
                            batchTransfers
                        }
                    });

                    // Show confirmation message
                    await ctx.reply(
                        this.formatBatchPreview(batchTransfers),
                        {
                            parse_mode: 'Markdown',
                            ...Markup.keyboard([['Confirm', 'Cancel']])
                                .oneTime()
                                .resize()
                        }
                    );
                    break;

                case 'batch_confirm':
                    if (text.toLowerCase() !== 'confirm') {
                        await ctx.reply('Transfer cancelled');
                        this.resetTransferState(userId);
                        return;
                    }

                    await this.executeBatchTransfer(ctx, state);
                    break;
            }
        } catch (error) {
            console.error('Error in batch transfer flow:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
            this.resetTransferState(userId);
        }
    }

    private formatBatchPreview(transfers: any[]): string {
        const total = transfers.reduce((sum, t) => sum + Number(t.amount), 0);
        
        return `📝 *Batch Transfer Preview*\n\n` +
            `Recipients: ${transfers.length}\n` +
            `Amount per recipient: ${transfers[0].amount} ${transfers[0].currency}\n` +
            `Total amount: ${total} ${transfers[0].currency}\n\n` +
            `Recipients:\n` +
            transfers.map((t, i) => 
                `${i + 1}. ${t.email || t.walletAddress}`
            ).join('\n') +
            '\n\nPlease confirm to proceed with the transfers.';
    }

    private async executeBatchTransfer(ctx: Context, state: TransferState): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) return;

            await ctx.reply('⏳ Processing batch transfer...');

            // First check wallet balance
            const walletBalances = await TransferCrud.getWalletBalances(accessToken);
            const currency = state.data.currency!;
            const totalAmount = state.data.batchTransfers!.reduce(
                (sum, t) => sum + Number(TransferModel.convertToBaseUnit(t.amount, t.currency)), 
                0
            );

            // Safely find balance, handling undefined case
            const balance = Array.isArray(walletBalances) 
                ? walletBalances.find(b => b?.symbol?.toUpperCase() === currency.toUpperCase())
                : null;

            // If no balance found or insufficient balance, show error
            const formattedBalance = balance 
                ? TransferModel.formatFromBaseUnit(balance.balance, currency)
                : '0';
            const formattedAmount = TransferModel.formatFromBaseUnit(totalAmount.toString(), currency);

            if (!balance || Number(balance.balance) < totalAmount) {
                await ctx.reply(
                    `❌ *Insufficient Balance*\n\n` +
                    `Required: ${formattedAmount} ${currency}\n` +
                    `Available: ${formattedBalance} ${currency}\n\n` +
                    `Please add funds to your wallet and try again.`,
                    { parse_mode: 'Markdown' }
                );
                this.resetTransferState(ctx.from!.id);
                return;
            }

            // Proceed with transfer if balance is sufficient
            const batchTransfers = state.data.batchTransfers!.map((transfer, index) => {
                const amount = TransferModel.convertToBaseUnit(transfer.amount, transfer.currency);
                return {
                    requestId: `batch-${Date.now()}-${index}`,
                    request: {
                        amount,
                        currency: transfer.currency.toUpperCase(),
                        purposeCode: 'self',
                        ...(transfer.email 
                            ? { email: transfer.email.toLowerCase() } 
                            : { walletAddress: transfer.walletAddress })
                    }
                };
            });

            const data: BatchTransferRequestPayload = { 
                requests: batchTransfers
            };

            console.log('Sending batch transfer request:', JSON.stringify(data, null, 2));

            const result = await TransferCrud.sendBatchTransfer(accessToken, data);

            await ctx.reply(
                TransferModel.getBatchTransferInfo(result.responses),
                { parse_mode: 'Markdown' }
            );

            this.resetTransferState(ctx.from!.id);
        } catch (error) {
            console.error('Failed to execute batch transfer:', error);
            
            let errorMessage = '❌ *Insufficient Balance*\n\n';
            errorMessage += 'You have insufficient balance to complete this transfer.\n';
            errorMessage += 'Please add funds to your wallet and try again.';
            
            await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
            this.resetTransferState(ctx.from!.id);
        }
    }

    private async handleEmailTransferFlow(ctx: Context, text: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.getState(userId);
        if (!state) return;

        try {
            switch (state.step) {
                case 'currency':
                    if (!['USDC', 'USDT'].includes(text.toUpperCase())) {
                        await ctx.reply('❌ Please select a valid currency (USDC or USDT)');
                        return;
                    }

                    this.setState(userId, {
                        step: 'amount',
                        data: { ...state.data, currency: text.toUpperCase() }
                    });

                    await ctx.reply(
                        '💰 Enter the amount to send:',
                        Markup.keyboard([['Cancel']])
                            .oneTime()
                            .resize()
                    );
                    break;

                case 'amount':
                    const amount = text.trim();
                    if (isNaN(Number(amount)) || Number(amount) <= 0) {
                        await ctx.reply('❌ Please enter a valid positive number');
                        return;
                    }

                    this.setState(userId, {
                        step: 'email_address',
                        data: { ...state.data, amount }
                    });

                    await ctx.reply(
                        '📧 Enter the recipient\'s email address:',
                        Markup.keyboard([['Cancel']])
                            .oneTime()
                            .resize()
                    );
                    break;

                case 'email_address':
                    const email = text.trim().toLowerCase();
                    if (!this.isValidEmail(email)) {
                        await ctx.reply('❌ Please enter a valid email address');
                        return;
                    }

                    this.setState(userId, {
                        step: 'email_confirm',
                        data: { ...state.data, email }
                    });

                    const previewMessage = 
                        `📝 *Transfer Preview*\n\n` +
                        `To: \`${email}\`\n` +
                        `Amount: ${state.data.amount} ${state.data.currency}\n\n` +
                        `Please confirm this transfer:`;

                    await ctx.reply(
                        previewMessage,
                        {
                            parse_mode: 'Markdown',
                            ...Markup.keyboard([['Confirm', 'Cancel']])
                                .oneTime()
                                .resize()
                        }
                    );
                    break;

                case 'email_confirm':
                    if (text.toLowerCase() !== 'confirm') {
                        await ctx.reply('❌ Transfer cancelled');
                        this.resetTransferState(userId);
                        return;
                    }

                    await this.executeEmailTransfer(ctx, state);
                    break;
            }
        } catch (error) {
            console.error('Error in email transfer flow:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
            this.resetTransferState(userId);
        }
    }

    private async executeEmailTransfer(ctx: Context, state: TransferState): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) return;

            await ctx.reply('⏳ Processing transfer...');

            // First check wallet balance
            const walletBalances = await TransferCrud.getWalletBalances(accessToken);
            const currency = state.data.currency!;
            const amount = TransferModel.convertToBaseUnit(state.data.amount!, currency);

            const balance = Array.isArray(walletBalances) 
                ? walletBalances.find(b => b?.symbol?.toUpperCase() === currency.toUpperCase())
                : null;

            if (!balance || Number(balance.balance) < Number(amount)) {
                const formattedBalance = balance 
                    ? TransferModel.formatFromBaseUnit(balance.balance, currency)
                    : '0';
                const formattedAmount = state.data.amount;

                await ctx.reply(
                    `❌ *Insufficient Balance*\n\n` +
                    `Required: ${formattedAmount} ${currency}\n` +
                    `Available: ${formattedBalance} ${currency}\n\n` +
                    `Please add funds to your wallet and try again.`,
                    { parse_mode: 'Markdown' }
                );
                this.resetTransferState(ctx.from!.id);
                return;
            }

            const transferRequest: TransferRequest = {
                email: state.data.email!.toLowerCase(),
                amount,
                currency: state.data.currency!,
                purposeCode: 'self'
            };

            const result = await TransferCrud.sendTransfer(accessToken, transferRequest);

            const successMessage = 
                `✅ *Transfer Successful*\n\n` +
                `ID: \`${result.id}\`\n` +
                `To: \`${state.data.email}\`\n` +
                `Amount: ${state.data.amount} ${state.data.currency}\n` +
                `Status: ${result.status}`;

            await ctx.reply(successMessage, { parse_mode: 'Markdown' });
            this.resetTransferState(ctx.from!.id);
        } catch (error) {
            console.error('Failed to execute email transfer:', error);
            
            let errorMessage = '❌ *Transfer Failed*\n\n';
            if (axios.isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data;
                if (Array.isArray(errorData.message)) {
                    // Handle validation errors more specifically
                    errorMessage += errorData.message
                        .map((err: any) => {
                            const constraints = err.constraints ? Object.values(err.constraints).join(', ') : '';
                            return `${err.property}: ${constraints}`;
                        })
                        .join('\n');
                } else {
                    errorMessage += errorData.message || 'An unexpected error occurred';
                }
            } else {
                errorMessage += 'An unexpected error occurred';
            }
            
            await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
            this.resetTransferState(ctx.from!.id);
        }
    }
}