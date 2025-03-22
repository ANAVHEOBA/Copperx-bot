export const MENUS = {
    START: {
        title: '🏠 Welcome to Copperx Bot!\n\n' +
               '❗️ You need to login first to access the features.\n' +
               'Please click the Login button below:',
        options: [
            { text: '🔑 Login', callback: 'start_login' },
            { text: 'ℹ️ Help', callback: 'menu_help' }
        ]
    },
    
    // After login, show this main menu
    MAIN: {
        title: '🏠 Welcome to Copperx Bot!\nWhat would you like to do?',
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
            { text: '💰 All Balances', callback: 'wallet_all_balances' },
            { text: '🪙 Token Balance', callback: 'wallet_token_balance' },
            { text: '📊 View History', callback: 'wallet_history' },
            { text: '🔄 Set Default', callback: 'wallet_set_default' },
            { text: '🌐 Networks', callback: 'wallet_networks' },
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
    KYC: [
        'kyc',
        'verify',
        'verification',
        'identity'
    ]
};

// Add login states to track conversation
export const LOGIN_STATES = {
    NONE: 'none',
    WAITING_EMAIL: 'waiting_email',
    WAITING_OTP: 'waiting_otp'
}; 