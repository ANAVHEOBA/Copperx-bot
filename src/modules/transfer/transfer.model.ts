import { Transfer } from './transfer.schema';
import { BatchTransferResponse } from './transfer.schema';

export class TransferModel {
    private transfer: Transfer;

    constructor(transfer: Transfer) {
        this.transfer = transfer;
    }

    getTransferInfo(): string {
        return `🔄 Transfer Details:\n\n` +
            `ID: ${this.transfer.id}\n` +
            `Status: ${this.getStatusEmoji()} ${this.transfer.status}\n` +
            `Amount: ${this.transfer.amount} ${this.transfer.currency}\n` +
            `Fee: ${this.transfer.totalFee} ${this.transfer.feeCurrency}\n` +
            `Type: ${this.transfer.type}\n` +
            `Mode: ${this.transfer.mode}\n` +
            `Purpose: ${this.transfer.purposeCode}\n\n` +
            `From: ${this.getSourceInfo()}\n` +
            `To: ${this.getDestinationInfo()}`;
    }

    private getStatusEmoji(): string {
        switch (this.transfer.status) {
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
            `Status: ${this.getStatusEmoji()} ${this.transfer.status}\n` +
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
} 