# Troubleshooting Guide

## Common Issues & Solutions

1. Bot Not Responding
   Problem: Bot doesn't respond to commands
   Solutions:
   - Check TELEGRAM_BOT_TOKEN validity
   - Verify bot is running: npm start
   - Check server logs for errors
   - Ensure webhook is properly set
   Debug Steps:
   ```
   console.log('Bot status:', bot.isRunning);
   console.log('Token:', BOT_TOKEN.substring(0,10) + '...');
   console.log('Webhook info:', await bot.telegram.getWebhookInfo());
   ```

2. Authentication Failures
   Problem: Users can't log in
   Solutions:
   - Verify API_BASE_URL is correct
   - Check email service connectivity
   - Clear user session: SessionManager.clearSession(userId)
   - Verify OTP delivery
   Logs to Check:
   ```
   console.error('Auth error:', {
       email: userEmail,
       error: error.message,
       timestamp: new Date()
   });
   ```

3. Transfer Issues
   Problem: Transfers failing
   Solutions:
   - Check wallet balance
   - Verify recipient details
   - Check network status
   - Validate transfer amount
   Debug Code:
   ```
   try {
       const balance = await WalletController.getBalance();
       const transfer = await TransferController.execute(data);
       console.log('Transfer debug:', { balance, transfer, status });
   } catch (error) {
       console.error('Transfer failed:', error);
   }
   ```

4. Session Problems
   Problem: Sessions not persisting
   Solutions:
   - Check .sessions.json permissions
   - Verify file write access
   - Clear corrupted sessions
   - Restart bot service
   Recovery:
   ```
   SessionStore.initialize();
   SessionStore.save();
   console.log('Sessions recovered:', SessionStore.count());
   ```

5. API Connection Issues
   Problem: Can't connect to API
   Solutions:
   - Verify API_BASE_URL
   - Check network connectivity
   - Validate API tokens
   - Check rate limits
   Diagnostics:
   ```
   axios.get(`${API_BASE_URL}/health`)
       .then(response => console.log('API status:', response.status))
       .catch(error => console.error('API error:', error));
   ```

6. Notification Problems
   Problem: Missing real-time updates
   Solutions:
   - Check Pusher credentials
   - Verify channel subscription
   - Check event binding
   - Validate auth token
   Debug:
   ```
   notificationsService.debug({
       pusherKey: CONFIG.PUSHER.KEY,
       channel: `private-org-${orgId}`,
       events: ['deposit', 'transfer']
   });
   ```

7. Memory Issues
   Problem: Bot becomes unresponsive
   Solutions:
   - Check memory usage
   - Clear old sessions
   - Optimize large operations
   - Increase memory limit
   Monitoring:
   ```
   const used = process.memoryUsage();
   console.log('Memory usage:', {
       heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
       heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`
   });
   ```

8. Rate Limiting
   Problem: Too many requests
   Solutions:
   - Implement request queuing
   - Add delay between operations
   - Optimize batch operations
   - Monitor usage patterns
   Implementation:
   ```
   const rateLimiter = {
       requests: 0,
       lastReset: Date.now(),
       check() {
           if (Date.now() - this.lastReset > 60000) {
               this.requests = 0;
               this.lastReset = Date.now();
           }
           return this.requests++ < MAX_REQUESTS_PER_MINUTE;
       }
   };
   ```

9. Database Sync Issues
   Problem: Inconsistent data
   Solutions:
   - Verify data integrity
   - Check sync operations
   - Validate timestamps
   - Clear cache if needed
   Verification:
   ```
   async function verifyDataSync() {
       const localData = await SessionStore.getAll();
       const apiData = await fetchUserData();
       console.log('Sync check:', {
           local: localData.length,
           api: apiData.length,
           matches: compareData(localData, apiData)
       });
   }
   ```

10. Error Recovery
    Problem: System crash recovery
    Solutions:
    - Implement auto-restart
    - Save session states
    - Log error details
    - Notify admin
    Implementation:
    ```
    process.on('uncaughtException', async (error) => {
        await SessionStore.save();
        console.error('Fatal error:', error);
        notifyAdmin(error);
        process.exit(1);
    });
    ```

## Quick Fixes

1. Reset Bot
   ```
   /stop
   SessionStore.clear();
   await bot.telegram.deleteWebhook();
   await bot.launch();
   ```

2. Clear User Session
   ```
   SessionManager.clearSession(userId);
   console.log('Session cleared for:', userId);
   ```

3. Reset Rate Limits
   ```
   RateLimiter.reset(userId);
   console.log('Rate limits reset for:', userId);
   ```

## Diagnostic Commands

1. Health Check
   ```
   /status - System status
   /debug - Debug information
   /ping - API connectivity
   ```

2. Admin Commands
   ```
   /system - System information
   /users - Active users
   /clear - Clear sessions
   ```

## Error Codes

1. Authentication
   - AUTH001: Invalid token
   - AUTH002: OTP expired
   - AUTH003: Session invalid

2. Transfers
   - TRF001: Insufficient balance
   - TRF002: Invalid recipient
   - TRF003: Network error

3. System
   - SYS001: Memory limit
   - SYS002: Rate limit
   - SYS003: API timeout

## Contact Support

1. Technical Support
   - Email: wisdomvolt@gmail.com
   - Telegram: @anavheoba
   

2. Emergency Contacts
   - System Admin: wisdomvolt@gmail.com
   