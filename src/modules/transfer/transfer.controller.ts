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

export class TransferController {
    private pendingTransfers: Map<number, TransferRequest> = new Map();

    async handleSendTransfer(ctx: Context): Promise<void> {
        try {
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('Please login first using /login');
                return;
            }

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

            this.pendingTransfers.set(userId, data);

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
        if (!userId || !this.pendingTransfers.has(userId)) {
            await ctx.reply('No pending transfer found. Please start a new transfer.');
            return;
        }

        const message = ctx.message as Message.TextMessage;
        if (message?.text?.toLowerCase() === 'confirm') {
            const data = this.pendingTransfers.get(userId)!;
            try {
                const accessToken = await SessionManager.getToken(ctx);
                const transfer = await TransferCrud.sendTransfer(accessToken!, data);
                const model = new TransferModel(transfer);
                await ctx.reply(model.getTransferInfo());
            } catch (error) {
                console.error('Failed to send transfer:', error);
                await ctx.reply('❌ Failed to send transfer. Please try again.');
            }
        } else if (message?.text?.toLowerCase() === 'cancel') {
            await ctx.reply('Transfer cancelled.');
        }

        this.pendingTransfers.delete(userId);
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
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('Please login first using /login');
                return;
            }

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
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('Please login first using /login');
                return;
            }

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
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('Please login first using /login');
                return;
            }

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
            const accessToken = await SessionManager.getToken(ctx);
            if (!accessToken) {
                await ctx.reply('Please login first using /login');
                return;
            }

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