export const MENUS = {
    MAIN: {
        title: '🏠 Welcome to Copperx Bot!\nPlease select an option:',
        options: [
            { text: '💰 Wallet', callback: 'menu_wallet' },
            { text: '💸 Transfer', callback: 'menu_transfer' },
            { text: '🔐 Account', callback: 'menu_account' },
            { text: '📝 KYC', callback: 'menu_kyc' },
            { text: 'ℹ️ Help', callback: 'menu_help' }
        ]
    },
    WALLET: {
        title: '💰 Wallet Menu\nManage your wallet:',
        options: [
            { text: '💵 Check Balance', callback: 'wallet_balance' },
            { text: '📊 View History', callback: 'wallet_history' },
            { text: '📥 Deposit', callback: 'wallet_deposit' },
            { text: '🔄 Set Default', callback: 'wallet_set_default' },
            { text: '⬅️ Back to Main', callback: 'menu_main' }
        ]
    },
    TRANSFER: {
        title: '💸 Transfer Menu\nSend funds:',
        options: [
            { text: '📧 Send to Email', callback: 'transfer_email' },
            { text: '👛 Send to Wallet', callback: 'transfer_wallet' },
            { text: '🏦 Bank Withdrawal', callback: 'transfer_bank' },
            { text: '📤 Batch Transfer', callback: 'transfer_batch' },
            { text: '⬅️ Back to Main', callback: 'menu_main' }
        ]
    },
    ACCOUNT: {
        title: '🔐 Account Menu\nManage your account:',
        options: [
            { text: '👤 View Profile', callback: 'account_profile' },
            { text: '🔑 Change Settings', callback: 'account_settings' },
            { text: '📱 2FA Setup', callback: 'account_2fa' },
            { text: '⬅️ Back to Main', callback: 'menu_main' }
        ]
    },
    KYC: {
        title: '📝 KYC Menu\nVerify your identity:',
        options: [
            { text: '📋 KYC Status', callback: 'kyc_status' },
            { text: '📎 Submit KYC', callback: 'kyc_submit' },
            { text: '📃 View Documents', callback: 'kyc_documents' },
            { text: '⬅️ Back to Main', callback: 'menu_main' }
        ]
    }
};

export const NATURAL_LANGUAGE_PATTERNS = {
    BALANCE: [
        'balance',
        'how much',
        'check wallet',
        'show balance',
        'wallet balance'
    ],
    TRANSFER: [
        'send',
        'transfer',
        'pay',
        'send money',
        'payment'
    ],
    DEPOSIT: [
        'deposit',
        'add funds',
        'receive',
        'add money'
    ],
    KYC: [
        'kyc',
        'verify',
        'verification',
        'identity'
    ]
}; 