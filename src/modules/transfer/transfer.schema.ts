export interface TransferRequest {
    walletAddress?: string;
    email?: string;
    payeeId?: string;
    amount: string;
    purposeCode: 'self' | string;
    currency: string;
}

export interface Account {
    id: string;
    createdAt: string;
    updatedAt: string;
    type: 'web3_wallet';
    country: string;
    network: string;
    accountId: string;
    walletAddress: string;
    bankName?: string;
    bankAddress?: string;
    bankRoutingNumber?: string;
    bankAccountNumber?: string;
    bankDepositMessage?: string;
    wireMessage?: string;
    payeeEmail?: string;
    payeeOrganizationId?: string;
    payeeId?: string;
    payeeDisplayName?: string;
}

export interface Customer {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    businessName: string;
    email: string;
    country: string;
}

export interface Transfer {
    id: string;
    createdAt: string;
    updatedAt: string;
    organizationId: string;
    status: 'pending' | 'completed' | 'failed';
    customerId: string;
    customer: Customer;
    type: 'send';
    sourceCountry: string;
    destinationCountry: string;
    destinationCurrency: string;
    amount: string;
    currency: string;
    amountSubtotal: string;
    totalFee: string;
    feePercentage: string;
    feeCurrency: string;
    invoiceNumber?: string;
    invoiceUrl?: string;
    sourceOfFundsFile?: string;
    note?: string;
    purposeCode: string;
    sourceOfFunds: string;
    recipientRelationship: string;
    sourceAccountId: string;
    destinationAccountId: string;
    paymentUrl?: string;
    mode: 'on_ramp';
    isThirdPartyPayment: boolean;
    sourceAccount: Account;
    destinationAccount: Account;
    senderDisplayName?: string;
}

export interface ErrorResponseDto {
    message: string | object;
    statusCode: number;
    error?: string;
}

export interface WalletWithdrawRequest {
    walletAddress: string;
    amount: string;
    purposeCode: 'self' | string;
    currency: string;
}

export interface CustomerData {
    name: string;
    businessName: string;
    email: string;
    country: string;
}

export interface OfframpRequest {
    invoiceNumber?: string;
    invoiceUrl?: string;
    purposeCode: 'self' | string;
    sourceOfFunds: 'salary' | string;
    recipientRelationship: 'self' | string;
    quotePayload: string;
    quoteSignature: string;
    preferredWalletId: string;
    customerData: {
        name: string;
        businessName: string;
        email: string;
        country: string;
    };
    sourceOfFundsFile?: string;
    note?: string;
}

export interface BatchTransferRequest {
    requestId: string;
    request: TransferRequest;
}

export interface BatchTransferResponse {
    requestId: string;
    request: TransferRequest;
    response?: Transfer;
    error?: ErrorResponseDto;
}

export interface BatchTransferRequestPayload {
    requests: BatchTransferRequest[];
}

export interface BatchTransferResponsePayload {
    responses: BatchTransferResponse[];
}

export interface TransferListParams {
    page?: number;
    limit?: number;
    sourceCountry?: string;
    destinationCountry?: string;
    status?: 'pending' | 'initiated' | 'processing' | 'success' | 'canceled' | 'failed' | 'refunded';
    sync?: boolean;
    type?: ('send' | 'receive' | 'withdraw' | 'deposit' | 'bridge' | 'bank_deposit')[];
    startDate?: string;
    endDate?: string;
}

export interface TransferListResponse {
    page: number;
    limit: number;
    count: number;
    hasMore: boolean;
    data: Transfer[];
}

export interface OfframpQuoteRequest {
    amount: string;
    currency: string;
    destinationCurrency: string;
    sourceCountry: string;
    destinationCountry: string;
    onlyRemittance: boolean;
    preferredBankAccountId?: string;
}

export interface OfframpQuote {
    id: string;
    amount: string;
    currency: string;
    destinationAmount: string;
    destinationCurrency: string;
    rate: string;
    fee: {
        amount: string;
        currency: string;
    };
    expiresAt: string;
    payload: string;
    signature: string;
}

export interface TransferState {
    step: 'currency' | 'amount' | 'wallet' | 'confirm' | 
          'offramp_quote' | 'offramp_signature' | 'offramp_wallet' | 
          'offramp_customer_name' | 'offramp_business_name' | 
          'offramp_email' | 'offramp_country' | 'offramp_confirm' |
          'batch_currency' | 'batch_amount' | 'batch_recipients' | 'batch_confirm';
    data: {
        currency?: string;
        amount?: string;
        recipients?: string[];
        batchTransfers?: {
            email?: string;
            walletAddress?: string;
            amount: string;
            currency: string;
        }[];
        walletAddress?: string;
        purposeCode?: string;
        quotePayload?: string;
        quoteSignature?: string;
        preferredWalletId?: string;
        customerData?: {
            name: string;
            businessName: string;
            email: string;
            country: string;
        };
        preferredBankAccountId?: string;
    };
}