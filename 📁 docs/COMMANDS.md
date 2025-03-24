# Bot Commands Documentation

## Core Commands

1. Start Command
   /start - Initializes the bot and shows welcome menu
   Usage: Simply type /start
   Response: Welcome message and initial menu options
   States: Checks login status and shows appropriate menu

2. Login Command
   /login - Starts authentication process
   Flow: 
   - Request email
   - Send OTP
   - Verify OTP
   - Store session
   Response Examples:
   "Enter your email:"
   "OTP sent to your@email.com"
   "Login successful! Welcome {name}"

3. Wallet Commands
   /balance - Check wallet balance
   /wallets - List all wallets
   /setdefault - Set default wallet
   Example Responses:
   "💰 Your USDC Balance: 100.00"
   "Select wallet to set as default:"
   "✅ Default wallet set successfully"

4. Transfer Commands
   /send - Start new transfer
   /sendmail - Send to email
   /sendwallet - Send to wallet address
   /batch - Start batch transfer
   Flow States:
   - Select currency
   - Enter amount
   - Confirm details
   - Execute transfer
   Example: 
   /send
   "Select transfer type:"
   "Enter amount:"
   "Confirm transfer of 100 USDC?"

5. Account Commands
   /profile - View profile details
   /logout - End session
   /help - Show help menu
   Response Format:
   "👤 Profile Information
    Name: John Doe
    Email: john@example.com
    Status: Verified"

## Menu Navigation

1. Main Menu Structure
   🏠 Main Menu
   ├── 💰 Wallet
   ├── 💸 Transfer
   ├── 🔐 Account
   ├── 📝 KYC
   └── ℹ️ Help

2. Wallet Menu
   💰 Wallet Menu
   ├── Check Balance
   ├── All Balances
   ├── Token Balance
   ├── View History
   ├── Set Default
   └── Back to Main

3. Transfer Menu
   💸 Transfer Menu
   ├── Send to Email
   ├── Send to Wallet
   ├── Batch Transfer
   ├── List Transfers
   ├── Bank Withdrawal
   └── Back to Main

## Natural Language Support

1. Balance Queries
   "what's my balance"
   "show balance"
   "how much do i have"
   Response: Shows current balance

2. Transfer Queries
   "send money"
   "transfer funds"
   "pay someone"
   Response: Initiates transfer flow

3. Help Queries
   "help"
   "how to"
   "what can you do"
   Response: Shows help menu

## State Management

1. Transfer States
   - CURRENCY_SELECT
   - AMOUNT_INPUT
   - RECIPIENT_INPUT
   - CONFIRMATION
   Example Flow:
   User: /send
   Bot: "Select currency: USDC/USDT"
   User: "USDC"
   Bot: "Enter amount:"

2. Authentication States
   - WAITING_EMAIL
   - WAITING_OTP
   - AUTHENTICATED
   Flow Control:
   - Validates inputs
   - Manages timeouts
   - Handles retries

## Error Handling

1. Invalid Commands
   Response: "Sorry, I don't understand that command. Try /help"

2. Authentication Errors
   - Invalid OTP: "❌ Invalid code. Please try again"
   - Expired OTP: "⌛ Code expired. Request new code?"
   - Invalid Email: "📧 Please enter a valid email"

3. Transfer Errors
   - Insufficient Balance: "❌ Insufficient funds"
   - Invalid Amount: "Please enter a valid amount"
   - Network Error: "Unable to complete transfer"

## Interactive Elements

1. Inline Keyboards
   Example Transfer Menu:
   [Send to Email] [Send to Wallet]
   [Batch Transfer] [History]
   [Back to Main Menu]

2. Custom Keyboards
   Quick Access Commands:
   [💰 Balance] [💸 Send]
   [👤 Profile] [❓ Help]

3. Action Buttons
   Confirmation Actions:
   [✅ Confirm] [❌ Cancel]
   [⬅️ Back]

## Session Management

1. Active Session Commands
   /status - Check session status
   /refresh - Refresh session
   /logout - End session

2. Session Timeouts
   - Inactivity warning: 5 minutes
   - Auto logout: 10 minutes
   - Token refresh: 7 days

## Security Features

1. Transaction Confirmation
   - Amount verification
   - Recipient confirmation
   - 2FA for large amounts
   Example:
   "Confirm send 1000 USDC to user@email.com?
   [Confirm] [Cancel]"

2. Rate Limiting
   - Max 3 failed OTP attempts
   - 5 transfers per minute
   - 60 commands per hour

## Help Documentation

1. General Help
   /help - Shows main help menu
   Response:
   "Available commands:
    /start - Start bot
    /login - Login to account
    /balance - Check balance
    /send - Send funds
    /help - Show this help"

2. Command-Specific Help
   /help <command>
   Example:
   /help transfer
   Response: Detailed transfer instructions

3. Context Help
   Automatic help suggestions based on errors
   Example:
   "Invalid amount. Try: /send 100 USDC"