export interface Wallet {
    id: string;
    createdAt: string;
    updatedAt: string;
    organizationId: string;
    walletType: 'web3_auth_copperx';
    network: string;
    walletAddress: string;
    isDefault: boolean;
}

export interface WalletBalance {
    decimals: number;
    balance: string;
    symbol: string;
    address: string;
}

export interface SetDefaultWalletRequest {
    walletId: string;
}

export interface ErrorResponseDto {
    message: string | object;
    statusCode: number;
    error?: string;
}

export interface TokenBalance {
    decimals: number;
    balance: string;
    symbol: string;
    address: string;
}

export interface RecoverTokensRequest {
    organizationId: string;
    chainId: string;
    amount: string;
    currency: string;
    toAccount: string;
}

export interface WalletSessionData {
    organizationId: string;
} 