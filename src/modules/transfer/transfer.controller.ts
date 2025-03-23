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

interface TransferState {
    step: 'currency' | 'amount' | 'email' | 'preview';
    data: Partial<TransferRequest>;
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
    protected transferStates: Map<number, TransferState> = new Map();

    public getState(userId: number): TransferState | undefined {
        const state = this.transferStates.get(userId);
        console.log('🔍 Getting transfer state:', {
            userId,
            hasState: !!state,
            step: state?.step,
            data: state?.data
        });
        return state;
    }

    public resetTransferState(userId: number): void {
        this.transferStates.delete(userId);
    }

    public setState(userId: number, state: TransferState): void {
        this.transferStates.set(userId, state);
        console.log('🔄 State updated for user:', userId, state);
    }

    public async handleCurrency(ctx: Context, currency: string): Promise<void> {
        console.log('\n💱 === HANDLE CURRENCY START ===');
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('❌ No userId found');
            return;
        }

        try {
            console.log('Processing currency:', currency);
            
            // Get wallet balances to verify the currency is available
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('❌ Please login first');
                return;
            }

            const wallets = await TransferCrud.getWalletBalances(accessToken);
            console.log('Wallet balances:', wallets);

            // Fix: Create state object with correct types
            const newState: TransferState = {
                step: 'amount' as const,
                data: {
                    purposeCode: 'self' as const,
                    currency: currency.toUpperCase()
                }
            };

            this.setState(userId, newState);
            console.log('State updated:', newState);

            // Ask for amount
            await ctx.reply(
                `💰 Enter amount of ${currency} to withdraw:`,
                Markup.removeKeyboard()
            );
            console.log('Amount prompt sent');

        } catch (error) {
            console.error('❌ Error handling currency:', error);
            await ctx.reply('Failed to process currency selection. Please try again.');
            this.resetTransferState(userId);
        }
        console.log('=== HANDLE CURRENCY END ===\n');
    }

    public async handleAmount(ctx: Context, amount: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            await ctx.reply('❌ Please enter a valid positive number.');
            return;
        }

        const state = this.transferStates.get(userId);
        if (!state) return;

        // Update state and ask for email
        this.transferStates.set(userId, {
            step: 'email',
            data: {
                ...state.data,
                amount
            }
        });

        await ctx.reply('📧 Enter recipient email address:');
    }

    async handleEmailInput(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId || !ctx.message || !('text' in ctx.message)) return;

        const email = ctx.message.text.trim();
        await this.handleEmail(ctx, email);
    }

    async handleTransferCancellation(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        this.transferStates.delete(userId);
        await ctx.reply('Transfer cancelled', Markup.removeKeyboard());
    }

    async handleEmailTransferStart(ctx: Context): Promise<void> {
        console.log('\n🔄 Starting email transfer flow');
        const userId = ctx.from?.id;
        if (!userId) return;

        // Set initial state
        const initialState: TransferState = {
            step: 'currency',
            data: { purposeCode: 'self' }
        };
        this.transferStates.set(userId, initialState);
        console.log('✅ Initial state set:', initialState);

        // Show currency selection keyboard with force reply
        await ctx.reply(
            '💱 Select currency to send (USDC, USDT, or ETH):',
            Markup.keyboard([
                ['USDC'], 
                ['USDT'],
                ['ETH']
            ])
            .oneTime()
            .resize()
        );
    }

    async handleMessage(ctx: Context): Promise<void> {
        console.log('\n📝 === DETAILED TRANSFER MESSAGE HANDLER LOG ===');
        
        // Log the entire context message for debugging
        console.log('Incoming message context:', {
            updateType: ctx.updateType,
            message: ctx.message,
            from: ctx.from,
            chat: ctx.chat
        });

        const userId = ctx.from?.id;
        if (!userId || !ctx.message || !('text' in ctx.message)) {
            console.error('❌ Message validation failed:', {
                hasUserId: !!userId,
                hasMessage: !!ctx.message,
                hasText: !!(ctx.message && 'text' in ctx.message)
            });
            return;
        }

        const state = this.transferStates.get(userId);
        const text = ctx.message.text.trim();

        // Log current state and message
        console.log('🔍 Current transfer state:', {
            userId,
            messageText: text,
            currentStep: state?.step,
            currentData: state?.data,
            hasState: !!state,
            transferStatesSize: this.transferStates.size
        });

        if (!state) {
            console.log('❌ No active transfer state found for user:', userId);
            return;
        }

        try {
            console.log(`\n🔄 Processing step: ${state.step}`);
            
            switch (state.step) {
                case 'currency':
                    console.log('💱 Starting currency selection handler');
                    console.log('Input currency:', text);
                    await this.handleCurrency(ctx, text);
                    console.log('Currency selection handler completed');
                    break;
                
                case 'amount':
                    console.log('💰 Starting amount handler');
                    console.log('Input amount:', text);
                    await this.handleAmount(ctx, text);
                    console.log('Amount handler completed');
                    break;
                
                default:
                    console.error('❌ Unknown step encountered:', state.step);
            }
        } catch (error) {
            console.error('❌ Error in transfer handler:', {
                error,
                step: state.step,
                input: text,
                userId
            });
            await ctx.reply('An error occurred. Please try again.');
            this.transferStates.delete(userId);
        }
        
        console.log('=== TRANSFER MESSAGE HANDLER END ===\n');
    }

    private async handleEmail(ctx: Context, email: string): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await ctx.reply('❌ Invalid email format. Please try again.');
            return;
        }

        const state = this.transferStates.get(userId);
        if (!state?.data.currency || !state?.data.amount) return;

        // Show confirmation
        await ctx.reply(
            `📝 Transfer Summary:\n\n` +
            `Amount: ${state.data.amount} ${state.data.currency}\n` +
            `To: ${email}\n\n` +
            `Confirm transfer?`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Confirm', 'transfer_confirm'),
                    Markup.button.callback('❌ Cancel', 'transfer_cancel')
                ]
            ])
        );

        // Save email to state
        this.transferStates.set(userId, {
            step: 'preview',
            data: {
                ...state.data,
                email
            }
        });
    }

    async handleWalletTransferStart(ctx: Context): Promise<void> {
        console.log('\n🔄 === WALLET TRANSFER START ===');
        
        await ctx.reply(
            '💱 Please enter your transfer details in the following format:\n\n' +
            '<amount> <currency> <wallet_address>\n\n' +
            'Example: 100 USDC 0x1234...\n\n' +
            'Supported currencies: USDC, USDT, ETH'
        );
    }

    async handleWalletTransferCommand(ctx: Context, text: string): Promise<void> {
        console.log('\n💸 === WALLET TRANSFER COMMAND START ===');
        console.log('Processing text:', text);

        try {
            const accessToken = await SessionManager.getToken(ctx);
            console.log('Access token found:', !!accessToken);
            
            if (!accessToken) {
                await ctx.reply('Please login first using /start');
                return;
            }

            // Parse command parameters
            const params = text.trim().split(' ');
            console.log('Parsed params:', params);

            if (params.length !== 3) {
                await ctx.reply(
                    '❌ Invalid format\n\n' +
                    'Please use: <amount> <currency> <wallet_address>\n' +
                    'Example: 100 USDC 0x1234...'
                );
                return;
            }

            const [amount, currency, walletAddress] = params;
            const upperCurrency = currency.toUpperCase();
            console.log('Processing transfer:', { amount, currency: upperCurrency, walletAddress });

            // Validate amount
            const numAmount = Number(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                await ctx.reply('❌ Please enter a valid positive number for amount.');
                return;
            }

            // Validate currency
            const validCurrencies = ['USDC', 'USDT', 'ETH'];
            if (!validCurrencies.includes(upperCurrency)) {
                await ctx.reply(`❌ Invalid currency. Please use one of: ${validCurrencies.join(', ')}`);
                return;
            }

            // Check wallet balance
            console.log('Checking wallet balance...');
            const wallets = await TransferCrud.getWalletBalances(accessToken);
            console.log('Wallet balances:', wallets);

            const currencyBalance = wallets.find((w: any) => 
                w.balances.some((b: any) => b.symbol === upperCurrency)
            )?.balances.find((b: any) => b.symbol === upperCurrency);

            if (!currencyBalance || Number(currencyBalance.balance) < numAmount) {
                await ctx.reply(`❌ Insufficient ${upperCurrency} balance.`);
                return;
            }

            // Show confirmation dialog
            const confirmationMessage = 
                `🔄 Confirm transfer:\n\n` +
                `Amount: ${amount} ${upperCurrency}\n` +
                `To: ${walletAddress}\n\n` +
                `Are you sure?`;

            console.log('Showing confirmation dialog');
            await ctx.reply(
                confirmationMessage,
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '✅ Confirm', 
                            `confirm_withdraw_${amount}_${upperCurrency}_${walletAddress}`
                        ),
                        Markup.button.callback('❌ Cancel', 'cancel_withdraw')
                    ]
                ])
            );

        } catch (error) {
            console.error('❌ Failed to process wallet transfer:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
        console.log('=== WALLET TRANSFER COMMAND END ===\n');
    }

    async handleBankTransferStart(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            await ctx.reply(
                '🏦 Bank Withdrawal\n\n' +
                'Please use the following format:\n' +
                '/withdraw <amount> <currency> <wallet_address>\n\n' +
                'Example:\n' +
                '/withdraw 1000 USDC 0x1234...',
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Back to Transfer Menu', 'menu_transfer')]
                ])
            );
        } catch (error) {
            console.error('Failed to start bank transfer:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
    }

    async handleBatchTransferStart(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            await ctx.reply(
                '📤 Batch Transfer\n\n' +
                'Please use the following format:\n' +
                '/send_batch <amount> <currency> <recipient1,recipient2,...>\n\n' +
                'Example:\n' +
                '/send_batch 100 USDC user1@example.com,0x1234...,user2@example.com',
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Back to Transfer Menu', 'menu_transfer')]
                ])
            );
        } catch (error) {
            console.error('Failed to start batch transfer:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
    }

    private async checkAuth(ctx: Context): Promise<string | null> {
        const accessToken = await SessionManager.getToken(ctx);
        if (!accessToken) {
            await ctx.reply('🔒 Please login first by clicking the Login button in the main menu');
            return null;
        }
        return accessToken;
    }

    async handleSendTransfer(ctx: Context): Promise<void> {
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
                await ctx.reply('Usage: /send <amount> <currency> <email_or_wallet>');
                return;
            }

            const [_, amount, currency, recipient] = args;

            // Validate amount
            if (isNaN(Number(amount)) || Number(amount) <= 0) {
                await ctx.reply('❌ Invalid amount. Please enter a positive number.');
                return;
            }

            // Validate recipient
            if (recipient.includes('@')) {
                if (!this.isValidEmail(recipient)) {
                    await ctx.reply('❌ Invalid email address format.');
                    return;
                }
            } else {
                if (!this.isValidWalletAddress(recipient)) {
                    await ctx.reply('❌ Invalid wallet address format.');
                    return;
                }
            }

            // Store pending transfer
            const userId = ctx.from?.id;
            if (!userId) {
                await ctx.reply('❌ User ID not found.');
                return;
            }

            const data: TransferRequest = {
                amount,
                currency,
                purposeCode: 'self',
                ...(recipient.includes('@') ? { email: recipient } : { walletAddress: recipient })
            };

            this.transferStates.set(userId, { step: 'preview', data });

            // Show preview and ask for confirmation
            const previewTransfer: Transfer = {
                id: 'preview',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                organizationId: '',
                status: 'pending',
                customerId: '',
                customer: {
                    id: '',
                    createdAt: '',
                    updatedAt: '',
                    name: '',
                    businessName: '',
                    email: '',
                    country: ''
                },
                type: 'send',
                sourceCountry: '',
                destinationCountry: '',
                destinationCurrency: currency,
                amount,
                currency,
                totalFee: '2.50', // This should come from an API call
                amountSubtotal: (Number(amount) + 2.50).toString(),
                feePercentage: '',
                feeCurrency: currency,
                purposeCode: 'self',
                sourceOfFunds: 'salary',
                recipientRelationship: 'self',
                sourceAccountId: '',
                destinationAccountId: '',
                mode: 'on_ramp',
                isThirdPartyPayment: false,
                sourceAccount: {
                    id: '',
                    createdAt: '',
                    updatedAt: '',
                    type: 'web3_wallet',
                    country: '',
                    network: '',
                    accountId: '',
                    walletAddress: ''
                },
                destinationAccount: {
                    id: '',
                    createdAt: '',
                    updatedAt: '',
                    type: 'web3_wallet',
                    country: '',
                    network: '',
                    accountId: '',
                    walletAddress: recipient.includes('@') ? '' : recipient,
                    payeeEmail: recipient.includes('@') ? recipient : undefined
                }
            };

            const model = new TransferModel(previewTransfer);
            await ctx.reply(model.getTransferPreview());

        } catch (error) {
            console.error('Failed to prepare transfer:', error);
            await ctx.reply('❌ Failed to prepare transfer. Please try again.');
        }
    }

    async handleTransferConfirmation(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId || !this.transferStates.has(userId)) {
            await ctx.reply('No pending transfer found. Please start a new transfer.');
            return;
        }

        try {
            const state = this.transferStates.get(userId)!;
            const data = state.data;
            
            // Validate required fields before sending
            if (!data.amount || !data.currency || !data.email) {
                await ctx.reply('❌ Missing required transfer information. Please start over.');
                this.transferStates.delete(userId);
                return;
            }

            // Create complete TransferRequest object
            const transferRequest: TransferRequest = {
                amount: data.amount,
                currency: data.currency,
                email: data.email,
                purposeCode: 'self'
            };

            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const transfer = await TransferCrud.sendTransfer(accessToken, transferRequest);
            const model = new TransferModel(transfer);
            await ctx.reply(model.getTransferInfo());
            
            // Clean up state after successful transfer
            this.transferStates.delete(userId);
        } catch (error) {
            console.error('Failed to send transfer:', error);
            await ctx.reply('❌ Failed to send transfer. Please try again.');
            this.transferStates.delete(userId);
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isValidWalletAddress(address: string): boolean {
        // Basic validation - should be enhanced based on specific blockchain requirements
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    async handleOfframp(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            const message = ctx.message as Message.TextMessage;
            if (!message?.text) {
                await ctx.reply('Invalid command format');
                return;
            }

            const args = message.text.split(' ');
            if (args.length !== 5) {
                await ctx.reply('Usage: /offramp <wallet_id> <quote_payload> <quote_signature> <customer_email>');
                return;
            }

            const [_, walletId, quotePayload, quoteSignature, email] = args;
            const data: OfframpRequest = {
                preferredWalletId: walletId,
                quotePayload,
                quoteSignature,
                purposeCode: 'self',
                sourceOfFunds: 'salary',
                recipientRelationship: 'self',
                customerData: {
                    name: '', // These will be filled by the backend
                    businessName: '',
                    email,
                    country: ''
                }
            };

            const transfer = await TransferCrud.createOfframp(accessToken, data);
            const transferModel = new TransferModel(transfer);

            await ctx.reply(
                '💱 Offramp Transfer Initiated!\n\n' +
                transferModel.getTransferInfo()
            );
        } catch (error) {
            console.error('Failed to create offramp transfer:', error);
            await ctx.reply('❌ Failed to create offramp transfer. Please try again.');
        }
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

            // Format: /send_batch <amount> <currency> <recipient1,recipient2,recipient3,...>
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
} 