# API Integration Documentation

## Overview
This document details the integration with Copperx's API endpoints, authentication flows, and real-time notification system.

## Base Configuration
const API_CONFIG = {
    BASE_URL: process.env.API_BASE_URL || 'https://income-api.copperx.io',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    PUSHER: {
        KEY: 'e089376087cac1a62785',
        CLUSTER: 'ap1',
        AUTH_ENDPOINT: '/api/notifications/auth'
    }
}

## Authentication Endpoints

1. Email OTP Request
   Endpoint: /api/auth/email-otp/request
   Method: POST
   Headers: Content-Type: application/json
   Body: {
       "email": "user@example.com"
   }
   Response: {
       "email": "user@example.com",
       "sid": "session_identifier"
   }

2. OTP Verification
   Endpoint: /api/auth/email-otp/authenticate
   Method: POST
   Body: {
       "email": "user@example.com",
       "otp": "123456",
       "sid": "session_identifier"
   }
   Response: {
       "scheme": "Bearer",
       "accessToken": "jwt_token",
       "expireAt": "timestamp"
   }

## Wallet Operations

1. Get Wallets
   Endpoint: /api/wallets
   Method: GET
   Auth: Bearer Token
   Response: {
       "data": [
           {
               "id": "wallet_id",
               "walletType": "web3_auth_copperx",
               "network": "network_name",
               "walletAddress": "address",
               "isDefault": boolean
           }
       ]
   }

2. Get Balances
   Endpoint: /api/wallets/balances
   Method: GET
   Auth: Bearer Token
   Response: {
       "decimals": 6,
       "balance": "100.000000",
       "symbol": "USDC",
       "address": "token_address"
   }

## Transfer Operations

1. Email Transfer
   Endpoint: /api/transfers/send
   Method: POST
   Auth: Bearer Token
   Body: {
       "email": "recipient@example.com",
       "amount": "100.00",
       "currency": "USDC",
       "purposeCode": "payment_purpose"
   }

2. Wallet Transfer
   Endpoint: /api/transfers/wallet-withdraw
   Method: POST
   Auth: Bearer Token
   Body: {
       "walletAddress": "recipient_address",
       "amount": "100.00",
       "currency": "USDC",
       "network": "network_name"
   }

3. Batch Transfer
   Endpoint: /api/transfers/send-batch
   Method: POST
   Auth: Bearer Token
   Body: {
       "transfers": [
           {
               "email": "recipient1@example.com",
               "amount": "100.00",
               "currency": "USDC"
           },
           {
               "walletAddress": "recipient_address",
               "amount": "50.00",
               "currency": "USDC"
           }
       ]
   }

## Real-time Notifications

1. Channel Authorization
   Endpoint: /api/notifications/auth
   Method: POST
   Auth: Bearer Token
   Body: {
       "socket_id": "socket_identifier",
       "channel_name": "private-org-{organizationId}"
   }

2. Event Types
   interface DepositNotification {
       amount: string;
       currency: string;
       network: string;
       transactionHash: string;
       status: string;
       explorerUrl?: string;
   }

## Error Handling

1. Standard Error Response
   interface ErrorResponseDto {
       message: string | object;
       statusCode: number;
       error?: string;
   }

2. Common Error Codes
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 429: Too Many Requests
   - 500: Internal Server Error

3. Implementation Example
   try {
       const response = await axios.post(endpoint, data, {
           headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
           }
       });
       return response.data;
   } catch (error) {
       if (axios.isAxiosError(error)) {
           throw {
               message: error.response?.data?.message || 'Unknown error',
               statusCode: error.response?.status || 500,
               error: error.message
           };
       }
       throw error;
   }

## Rate Limiting
- Login attempts: 5 per minute
- API requests: 100 per minute
- Notification subscriptions: 10 per minute

## Security Considerations
1. Token Storage: Secure session management
2. Request Validation: Input sanitization
3. Error Messages: Non-revealing responses
4. Rate Limiting: Prevent abuse
5. Channel Authorization: Secure real-time communications

## Implementation Examples

1. Authentication Flow
   async function authenticate(email: string, otp: string, sid: string) {
       try {
           const response = await AuthCrud.verifyOtp({
               email,
               otp,
               sid
           });
           await SessionManager.setToken(ctx, response.accessToken);
           return response;
       } catch (error) {
           console.error('Authentication error:', error);
           throw error;
       }
   }

2. Wallet Balance Check
   async function getWalletBalance(token: string) {
       try {
           const response = await WalletCrud.getBalances(token);
           return response;
       } catch (error) {
           console.error('Balance check error:', error);
           throw error;
       }
   }

3. Transfer Execution
   async function executeTransfer(transferData: TransferRequest, token: string) {
       try {
           const response = await TransferCrud.createTransfer(transferData, token);
           return response;
       } catch (error) {
           console.error('Transfer error:', error);
           throw error;
       }
   }