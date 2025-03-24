# Deployment Guide

## Prerequisites
- Node.js 16.x or higher
- npm 7.x or higher
- Git
- Render.com account or similar hosting platform
- Telegram Bot Token from @BotFather

## Local Deployment

1. Repository Setup
   git clone https://github.com/anavheoba/copperx-bot.git
   cd copperx-bot
   npm install
   cp .env.example .env

2. Environment Configuration
   TELEGRAM_BOT_TOKEN=your_bot_token
   API_BASE_URL=https://income-api.copperx.io
   PUSHER_KEY=e089376087cac1a62785
   PUSHER_CLUSTER=ap1
   NODE_ENV=production
   DEBUG=false
   API_TIMEOUT=30000
   API_RETRY_ATTEMPTS=3

3. Build & Run
   npm run build
   npm start

## Render.com Deployment

1. Service Configuration
   - Type: Web Service
   - Runtime: Node.js
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Instance Type: Free (512 MB)

2. Environment Variables
   Key                   Value
   TELEGRAM_BOT_TOKEN    your_bot_token
   API_BASE_URL          https://income-api.copperx.io
   PUSHER_KEY           e089376087cac1a62785
   PUSHER_CLUSTER       ap1
   NODE_ENV             production
   DEBUG                false

3. Deployment Steps
   - Connect GitHub repository
   - Configure environment variables
   - Deploy service
   - Verify bot status
   - Test basic commands

## Health Checks

1. Startup Verification
   - Environment variables check
   - API connectivity test
   - Bot token validation
   - Pusher connection test

2. Runtime Monitoring
   Log checks:
   console.log('🤖 Bot is running...');
   console.log('✅ Connected to API');
   console.log('📡 Pusher connected');

3. Error Monitoring
   try {
       // Operations
   } catch (error) {
       console.error('❌ Error:', error);
       // Error notification
   }

## Production Considerations

1. Security
   - Secure environment variables
   - Rate limiting enabled
   - Session persistence
   - Error handling
   - Input validation

2. Performance
   - Memory management
   - Connection pooling
   - Request timeouts
   - Graceful shutdown

3. Monitoring
   - API response times
   - Memory usage
   - Error rates
   - User activity

## Scaling Configuration

1. Resource Allocation
   - Memory: 512MB minimum
   - CPU: 0.1 vCPU minimum
   - Disk: 512MB minimum

2. Performance Optimization
   const CONFIG = {
       CACHE_TIMEOUT: 300,
       MAX_CONNECTIONS: 100,
       RATE_LIMIT: 60,
       SESSION_TIMEOUT: 3600
   }

3. Load Handling
   - Request queuing
   - Rate limiting
   - Connection pooling
   - Cache management

## Maintenance

1. Session Management
   - Auto-save every 5 minutes
   - Backup before updates
   - Cleanup old sessions
   - Token refresh handling

2. Error Recovery
   process.on('uncaughtException', (error) => {
       console.error('Fatal:', error);
       // Notification
       // Graceful shutdown
   });

3. Updates
   - Backup configuration
   - Test in staging
   - Deploy in maintenance window
   - Verify functionality

## Troubleshooting

1. Common Issues
   - Connection timeouts
   - Memory limits
   - Rate limiting
   - API errors
   - Session corruption

2. Debug Mode
   DEBUG=true npm start
   Logs:
   - API requests
   - Bot events
   - Error details
   - Performance metrics

3. Health Checks
   /status - Bot status
   /ping - API check
   /debug - Debug info

## Backup & Recovery

1. Session Backup
   - Automated backups
   - Manual export option
   - Version control
   - Restore procedure

2. Configuration Backup
   - Environment variables
   - Bot settings
   - User data
   - Logs

3. Recovery Steps
   - Stop service
   - Restore backup
   - Verify data
   - Restart service

## Monitoring Setup

1. Basic Monitoring
   console.log({
       memory: process.memoryUsage(),
       uptime: process.uptime(),
       connections: activeConnections,
       errors: errorCount
   });

2. Health Metrics
   - Response times
   - Error rates
   - Active users
   - API status

3. Alerts
   - Service down
   - High error rate
   - Memory usage
   - API failures

## SSL/Security

1. HTTPS Configuration
   - SSL certificate
   - Secure webhooks
   - API security
   - Data encryption

2. Security Headers
   - CORS policy
   - Content Security
   - XSS Protection
   - Rate Limiting

## Logging

1. Production Logs
   - Error tracking
   - User actions
   - System events
   - Performance data

2. Log Rotation
   - Daily rotation
   - Compression
   - Retention policy
   - Backup strategy

## Post-Deployment

1. Verification
   - Bot responses
   - API integration
   - Notifications
   - Error handling

2. Monitoring
   - Resource usage
   - Error rates
   - Response times
   - User activity

3. Documentation
   - Update guides
   - Configuration notes
   - Contact information
   - Recovery procedures