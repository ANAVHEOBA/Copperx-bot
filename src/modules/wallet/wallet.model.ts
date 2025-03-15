export class WalletModel {
    private id: string;
    private walletType: 'web3_auth_copperx';
    private network: string;
    private walletAddress: string;
    private isDefault: boolean;
    private balance?: {
        decimals: number;
        balance: string;
        symbol: string;
        address: string;
    };

    constructor(data: any) {
        this.id = data.id;
        this.walletType = data.walletType;
        this.network = data.network;
        this.walletAddress = data.walletAddress;
        this.isDefault = data.isDefault;
    }

    setBalance(balance: any) {
        this.balance = {
            decimals: balance.decimals,
            balance: balance.balance,
            symbol: balance.symbol,
            address: balance.address
        };
    }

    getFormattedBalance(): string {
        if (!this.balance) return 'Balance not available';
        return `${this.balance.balance} ${this.balance.symbol}`;
    }

    getWalletInfo(): string {
        return `🔑 Wallet: ${this.walletAddress}\n` +
               `Network: ${this.network}\n` +
               `Type: ${this.walletType}\n` +
               `Default: ${this.isDefault ? '✅' : '❌'}`;
    }
} 