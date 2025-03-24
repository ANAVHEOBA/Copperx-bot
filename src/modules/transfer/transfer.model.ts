import { Transfer } from './transfer.schema';
import { BatchTransferResponse } from './transfer.schema';
import { OfframpQuote } from './transfer.schema';

export class TransferModel {
    private transfer: Transfer;

    private static readonly USDC_DECIMALS = 9;
    private static readonly USDT_DECIMALS = 6;

    constructor(transfer: Transfer) {
        this.transfer = transfer;
    }

    getTransferInfo(): string {
        return `🔄 Transfer Details:\n\n` +
            `ID: ${this.transfer.id}\n` +
            `Status: ${TransferModel.getStatusEmoji(this.transfer.status)} ${this.transfer.status}\n` +
            `Amount: ${this.transfer.amount} ${this.transfer.currency}\n` +
            `Fee: ${this.transfer.totalFee} ${this.transfer.feeCurrency}\n` +
            `Type: ${this.transfer.type}\n` +
            `Mode: ${this.transfer.mode}\n` +
            `Purpose: ${this.transfer.purposeCode}\n\n` +
            `From: ${this.getSourceInfo()}\n` +
            `To: ${this.getDestinationInfo()}`;
    }

    private static getStatusEmoji(status: Transfer['status']): string {
        switch (status) {
            case 'completed': return '✅';
            case 'pending': return '⏳';
            case 'failed': return '❌';
            default: return '❓';
        }
    }

    private getSourceInfo(): string {
        const account = this.transfer.sourceAccount;
        return account.walletAddress || account.payeeEmail || 'Unknown';
    }

    private getDestinationInfo(): string {
        const account = this.transfer.destinationAccount;
        return account.walletAddress || account.payeeEmail || 'Unknown';
    }

    static getBatchTransferInfo(responses: BatchTransferResponse[]): string {
        let message = '🔄 Batch Transfer Results:\n\n';
        
        const successful = responses.filter(r => r.response && !r.error);
        const failed = responses.filter(r => r.error);
        
        message += `✅ Successful: ${successful.length}\n`;
        message += `❌ Failed: ${failed.length}\n\n`;
        
        responses.forEach((response, index) => {
            message += `Transfer #${index + 1}:\n`;
            message += `ID: ${response.requestId}\n`;
            if (response.response) {
                message += `Status: ✅ Success\n`;
                message += `Amount: ${response.response.amount} ${response.response.currency}\n`;
                message += `To: ${response.request.email || response.request.walletAddress}\n`;
            } else if (response.error) {
                message += `Status: ❌ Failed\n`;
                message += `Error: ${response.error.message}\n`;
            }
            message += '\n';
        });
        
        return message;
    }

    getTransferSummary(): string {
        return `🔄 *${this.transfer.type.toUpperCase()}* - ${this.transfer.id}\n` +
            `Status: ${TransferModel.getStatusEmoji(this.transfer.status)} ${this.transfer.status}\n` +
            `Amount: ${this.transfer.amount} ${this.transfer.currency}\n` +
            `Date: ${new Date(this.transfer.createdAt).toLocaleDateString()}`;
    }

    getTransferPreview(): string {
        return `🔍 Transfer Preview:\n\n` +
            `Amount: ${this.transfer.amount} ${this.transfer.currency}\n` +
            `Fee: ${this.transfer.totalFee} ${this.transfer.feeCurrency}\n` +
            `Total: ${this.transfer.amountSubtotal} ${this.transfer.currency}\n` +
            `To: ${this.getDestinationInfo()}\n\n` +
            `Reply with 'confirm' to proceed or 'cancel' to abort.`;
    }

    getMinimumAmountError(): string {
        return `❌ Error: Amount too low\n\n` +
            `Minimum withdrawal amount: ${this.transfer.currency} 100\n` +
            `Your amount: ${this.transfer.currency} ${this.transfer.amount}\n\n` +
            `Please try again with a higher amount.`;
    }

    static formatQuoteDetails(quote: OfframpQuote): string {
        const formattedAmount = this.formatFromBaseUnit(quote.amount, quote.currency);
        const formattedFee = this.formatFromBaseUnit(quote.fee.amount, quote.fee.currency);
        
        return `💱 *Quote Details*\n\n` +
            `Amount: ${formattedAmount} ${quote.currency}\n` +
            `You'll receive: ${quote.destinationAmount} ${quote.destinationCurrency}\n` +
            `Rate: ${quote.rate}\n` +
            `Fee: ${formattedFee} ${quote.fee.currency}\n` +
            `Expires: ${new Date(quote.expiresAt).toLocaleString()}\n\n` +
            `Please confirm to proceed with the transfer.`;
    }

    static formatOfframpTransferInfo(transfer: Transfer): string {
        return `💱 *Offramp Transfer Created*\n\n` +
            `ID: \`${transfer.id}\`\n` +
            `Status: ${TransferModel.getStatusEmoji(transfer.status)} ${transfer.status}\n` +
            `Amount: ${transfer.amount} ${transfer.currency}\n` +
            `You'll receive: ${transfer.amountSubtotal} ${transfer.destinationCurrency}\n` +
            `Fee: ${transfer.totalFee} ${transfer.feeCurrency}\n` +
            `Created: ${new Date(transfer.createdAt).toLocaleString()}\n\n` +
            `_Please check your bank account for the deposit._`;
    }

    static convertToBaseUnit(amount: string, currency: string): string {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return amount;

        let decimals = 0;
        switch (currency.toUpperCase()) {
            case 'USDC':
                decimals = this.USDC_DECIMALS;
                break;
            case 'USDT':
                decimals = this.USDT_DECIMALS;
                break;
            default:
                return amount;
        }

        return (numAmount * Math.pow(10, decimals)).toString();
    }

    static formatFromBaseUnit(amount: string, currency: string): string {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return amount;

        let decimals = 0;
        switch (currency.toUpperCase()) {
            case 'USDC':
                decimals = this.USDC_DECIMALS;
                break;
            case 'USDT':
                decimals = this.USDT_DECIMALS;
                break;
            default:
                return amount;
        }

        return (numAmount / Math.pow(10, decimals)).toString();
    }
} 