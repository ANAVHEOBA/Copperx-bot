# Setup Guide

## 📋 Prerequisites

1. **Node.js Requirements**
   - Node.js version 16.x or higher
   - npm version 7.x or higher

2. **Required Accounts**
   - Telegram Bot Token (from @BotFather)
   - Copperx API Access
   - Pusher Account

## 🔧 Installation

1. **Clone Repository**



bash
git clone https://github.com/your-username/copperx-bot.git
cd copperx-bot



2. **Install Dependencies**


bash
npm install




## ⚙️ Configuration

1. **Environment Setup**
Create a `.env` file in the root directory:



env
Required
TELEGRAM_BOT_TOKEN=your_bot_token_here
API_BASE_URL=https://income-api.copperx.io
PUSHER_KEY=e089376087cac1a62785
PUSHER_CLUSTER=ap1
Optional
NODE_ENV=development
DEBUG=true
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=3



2. **Environment Variables Explanation**

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| TELEGRAM_BOT_TOKEN | Yes | Your Telegram bot token | - |
| API_BASE_URL | Yes | Copperx API endpoint | - |
| PUSHER_KEY | Yes | Pusher app key | e089376087cac1a62785 |
| PUSHER_CLUSTER | Yes | Pusher cluster region | ap1 |
| NODE_ENV | No | Environment mode | development |
| DEBUG | No | Enable debug logging | false |
| API_TIMEOUT | No | API request timeout (ms) | 30000 |
| API_RETRY_ATTEMPTS | No | Number of API retry attempts | 3 |

## 🚀 Running the Bot

1. **Development Mode**


bash
npm run dev




2. **Production Mode**


bash
npm run build
npm start


## 🔍 Verification Steps

1. **Environment Check**
The bot automatically verifies:
- Required environment variables
- Bot token format
- API URL format
- Pusher configuration

2. **Bot Health Check**


typescript
// Verify bot is running
/start
// Expected response:
"Welcome to CopperX Bot! 🚀
I can help you manage your wallet, make transfers, and more."







## 📦 Session Management

Sessions are stored in `.sessions.json`:
- Auto-created on first run
- Persists user sessions
- Handles token expiration
- Auto-saves on shutdown

## 🛡️ Security Configuration

1. **Rate Limiting**
Configured in `src/utils/rate-limiter.ts`:
- Login attempts
- API requests
- Message handling

2. **Session Security**
Configured in `src/utils/session-manager.ts`:
- Token expiration: 7 days
- Secure storage
- Auto cleanup

## 🔄 Real-time Notifications Setup

1. **Pusher Configuration**





## 📦 Session Management

Sessions are stored in `.sessions.json`:
- Auto-created on first run
- Persists user sessions
- Handles token expiration
- Auto-saves on shutdown

## 🛡️ Security Configuration

1. **Rate Limiting**
Configured in `src/utils/rate-limiter.ts`:
- Login attempts
- API requests
- Message handling

2. **Session Security**
Configured in `src/utils/session-manager.ts`:
- Token expiration: 7 days
- Secure storage
- Auto cleanup

## 🔄 Real-time Notifications Setup

1. **Pusher Configuration**


typescript
// Automatically configured from env variables
// Handles:
Private channels
Authentication
Deposit notifications




## 🐛 Debug Mode

Enable detailed logging:


env
DEBUG=true



Debug information includes:
- API requests/responses
- Session operations
- Authentication flow
- Pusher events

## ⚠️ Common Setup Issues

1. **Invalid Bot Token**


Error: Invalid bot token format
Solution: Verify token from @BotFather




2. **API Connection Failed**


Error: Failed to connect to API
Solution: Check API_BASE_URL and network connectivity



3. **Session Storage Error**

Error: Failed to load/save sessions
Solution: Check file permissions for .sessions.json



## 📋 Next Steps

After setup:
1. Test basic functionality with `/start`
2. Configure notifications
3. Test authentication flow
4. Review security settings

