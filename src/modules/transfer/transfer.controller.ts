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

export class TransferController {
    protected transferStates: Map<number, TransferState> = new Map();

    public getState(userId: number): TransferState | undefined {
        const state = this.transferStates.get(userId);
        console.log('🔍 Getting transfer state:', {
            userId,
            hasState: !!state,
            state
        });
        return state;
    }

    public resetTransferState(userId: number): void {
        this.transferStates.delete(userId);
    }

    async handleEmailTransferStart(ctx: Context): Promise<void> {
        try {
            const userId = ctx.from?.id;
            if (!userId) return;

            // Initialize transfer state
            const initialState: TransferState = {
                step: 'currency',
                data: {
                    purposeCode: 'self'
                }
            };
            this.transferStates.set(userId, initialState);
            console.log('Initial state set:', initialState); // Debug log

            // Show currency selection keyboard
            const validCurrencies = ['USD', 'USDC', 'USDT', 'ETH', 'BTC'];
            await ctx.reply(
                '💱 Select the currency you want to send:',
                Markup.keyboard(validCurrencies.map(c => [c]).concat([['❌ Cancel']]))
                    .oneTime()
                    .resize()
            );
        } catch (error) {
            console.error('Error starting email transfer:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
            this.resetTransferState(ctx.from?.id!);
        }
    }

    async handleCurrencySelection(ctx: Context): Promise<void> {
        console.log('\n💱 === CURRENCY SELECTION HANDLER ===');
        const userId = ctx.from?.id;
        if (!userId) {
            console.log('❌ No userId found in currency selection');
            return;
        }

        const state = this.transferStates.get(userId);
        console.log('🔄 Current state:', state);
        console.log('📩 Message:', ctx.message);

        if (!state || state.step !== 'currency') {
            console.log('❌ Invalid state for currency selection:', {
                hasState: !!state,
                step: state?.step
            });
            return;
        }

        const message = ctx.message as Message.TextMessage;
        const selectedCurrency = message?.text?.trim();
        console.log('💱 Selected currency:', selectedCurrency);

        if (!selectedCurrency) {
            console.log('❌ No currency text found');
            await ctx.reply('Please select a currency from the keyboard');
            return;
        }

        if (selectedCurrency === '❌ Cancel') {
            console.log('✅ Transfer cancelled by user');
            this.resetTransferState(userId);
            await ctx.reply('Transfer cancelled', Markup.removeKeyboard());
            return;
        }

        const validCurrencies = ['USD', 'USDC', 'USDT', 'ETH', 'BTC'];
        if (!validCurrencies.includes(selectedCurrency)) {
            console.log('❌ Invalid currency selected:', selectedCurrency);
            await ctx.reply(
                '❌ Please select a valid currency:',
                Markup.keyboard(validCurrencies.map(c => [c]).concat([['❌ Cancel']]))
                    .oneTime()
                    .resize()
            );
            return;
        }

        // Update state with selected currency
        const newState: TransferState = {
            step: 'amount',
            data: {
                ...state.data,
                currency: selectedCurrency,
                purposeCode: 'self'
            }
        };
        
        console.log('✅ Setting new state:', newState);
        this.transferStates.set(userId, newState);

        // Move to amount input
        await ctx.reply(
            '💰 Enter the amount to send:',
            Markup.removeKeyboard()
        );
        console.log('✅ Amount prompt sent');
        console.log('=== CURRENCY SELECTION HANDLER END ===\n');
    }

    async handleAmountInput(ctx: Context): Promise<void> {
        console.log('handleAmountInput called'); // Debug log
        
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.transferStates.get(userId);
        if (!state || state.step !== 'amount') return;

        const message = ctx.message as Message.TextMessage;
        if (!message?.text) return;

        const amount = message.text.trim();
        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            await ctx.reply('❌ Please enter a valid positive number.');
            return;
        }

        // Update state with amount and move to email step
        const newState: TransferState = {
            step: 'email',
            data: {
                ...state.data,
                amount
            }
        };
        
        this.transferStates.set(userId, newState);

        // Prompt for email
        await ctx.reply(
            '📧 Please enter the recipient\'s email address:',
            { reply_markup: { force_reply: true } }
        );
    }

    async handleEmailInput(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        const state = this.transferStates.get(userId);
        if (!state || state.step !== 'email') return;

        const message = ctx.message as Message.TextMessage;
        const email = message?.text;
        if (!email || !this.isValidEmail(email)) {
            await ctx.reply('❌ Please enter a valid email address');
            return;
        }

        state.data.email = email;
        state.data.purposeCode = 'self';
        state.step = 'preview';
        this.transferStates.set(userId, state);

        const previewTransfer = await this.createPreviewTransfer(state.data);
        const model = new TransferModel(previewTransfer);

        await ctx.reply(
            model.getTransferPreview(),
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Confirm', 'transfer_confirm'),
                    Markup.button.callback('❌ Cancel', 'transfer_cancel')
                ]
            ])
        );
    }

    private async createPreviewTransfer(data: Partial<TransferRequest>): Promise<Transfer> {
        return {
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
            destinationCurrency: data.currency!,
            amount: data.amount!,
            currency: data.currency!,
            totalFee: '2.50',
            amountSubtotal: (Number(data.amount) + 2.50).toString(),
            feePercentage: '',
            feeCurrency: data.currency!,
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
                walletAddress: '',
                payeeEmail: data.email
            }
        };
    }

    async handleTransferCancellation(ctx: Context): Promise<void> {
        const userId = ctx.from?.id;
        if (!userId) return;

        this.transferStates.delete(userId);
        await ctx.answerCbQuery();
        await ctx.reply('❌ Transfer cancelled');
    }

    async handleWalletTransferStart(ctx: Context): Promise<void> {
        try {
            const accessToken = await this.checkAuth(ctx);
            if (!accessToken) return;

            await ctx.reply(
                '👛 Send to Wallet\n\n' +
                'Please use the following format:\n' +
                '/send <amount> <currency> <wallet_address>\n\n' +
                'Example:\n' +
                '/send 50 USDC 0x1234...',
                Markup.inlineKeyboard([
                    [Markup.button.callback('⬅️ Back to Transfer Menu', 'menu_transfer')]
                ])
            );
        } catch (error) {
            console.error('Failed to start wallet transfer:', error);
            await ctx.reply('❌ An error occurred. Please try again.');
        }
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

    async handleWalletWithdraw(ctx: Context): Promise<void> {
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
                await ctx.reply('Usage: /withdraw <amount> <currency> <wallet_address>');
                return;
            }

            const [_, amount, currency, walletAddress] = args;
            const data: WalletWithdrawRequest = {
                amount,
                currency,
                walletAddress,
                purposeCode: 'self'
            };

            const transfer = await TransferCrud.withdrawToWallet(accessToken, data);
            const transferModel = new TransferModel(transfer);

            await ctx.reply(
                '💸 Withdrawal Initiated!\n\n' +
                transferModel.getTransferInfo()
            );
        } catch (error) {
            console.error('Failed to withdraw to wallet:', error);
            await ctx.reply('❌ Failed to withdraw to wallet. Please try again.');
        }
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