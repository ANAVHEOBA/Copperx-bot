# Copperx Telegram Bot

A powerful Telegram bot for managing USDC transactions, wallets, and transfers through Copperx's platform.

## 🌟 Features

- **Authentication**
  - Email-based OTP login
  - Secure session management
  - Auto token refresh

- **Wallet Management**
  - View balances
  - Check token balances
  - Set default wallet
  - View transaction history
  - Multi-network support

- **Transfer Capabilities**
  - Email transfers
  - Wallet-to-wallet transfers
  - Batch transfers
  - Bank withdrawals
  - Offramp functionality

- **Real-time Notifications**
  - Deposit alerts
  - Transaction status updates
  - Custom Pusher integration

- **KYC Integration**
  - Status checking
  - Document submission
  - Verification flow

## 🚀 Quick Start

1. Clone the repository:


bash
git clone https://github.com/anavheoba/copperx-bot.git




2. Install dependencies:

bash
cd copperx-bot
npm install



3. Configure environment variables:

bash
cp .env.example .env



Required environment variables:
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `API_BASE_URL`: Copperx API endpoint
- `PUSHER_KEY`: Pusher app key
- `PUSHER_CLUSTER`: Pusher cluster region

4. Start the bot:


bash
npm run start



## 🏗️ Project Structure


src/
├── app.ts # Main application setup
├── config/
│ └── env.ts # Environment configuration
├── modules/
│ ├── auth/ # Authentication module
│ ├── kyc/ # KYC verification
│ ├── menu/ # Menu system
│ ├── notifications/ # Real-time notifications
│ ├── transfer/ # Transfer functionality
│ └── wallet/ # Wallet management
├── types/
│ └── context.ts # Type definitions
└── utils/
├── rate-limiter.ts
├── session-manager.ts
└── telegram-helpers.ts




## 🔒 Security Features

- Session-based authentication
- Token expiration handling
- Rate limiting
- Secure OTP verification
- Environment validation

## 📚 Documentation

Detailed documentation is available in the `docs` folder:

- [Setup Guide](docs/SETUP.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Integration](docs/API-INTEGRATION.md)
- [Bot Commands](docs/COMMANDS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please contact me anavheoba 

