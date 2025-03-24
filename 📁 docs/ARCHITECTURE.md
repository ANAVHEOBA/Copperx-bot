# Architecture Overview

## 🏗️ System Architecture

### Core Components


mermaid
graph TD
A[index.ts] --> B[app.ts]
B --> C[Modules]
B --> D[Utils]
C --> C1[Auth]
C --> C2[Wallet]
C --> C3[Transfer]
C --> C4[KYC]
C --> C5[Menu]
C --> C6[Notifications]
D --> D1[Session Manager]
D --> D2[Rate Limiter]



## 📦 Module Structure

### 1. Core Application (app.ts)
- Bot initialization
- Middleware setup
- Module registration
- Error handling
- Session management
- Graceful shutdown

### 2. Authentication Module


typescript
// Authentication Flow
auth.route.ts (Entry Point)
↓
auth.controller.ts (Business Logic)
↓
auth.crud.ts (API Calls)
↓
auth.schema.ts (Data Types)



Key Features:
- Email OTP authentication
- Session management
- Token refresh
- User profile management

### 3. Menu System


typescript
menu.service.ts
├── Command handlers
├── State management
├── Navigation logic
└── User interaction



Menu States:
- START
- MAIN
- WALLET
- TRANSFER
- ACCOUNT
- KYC

### 4. Wallet Management

typescript
wallet.route.ts
↓
wallet.controller.ts
↓
wallet.crud.ts
↓
wallet.schema.ts



Features:
- Balance checking
- Default wallet setting
- Multi-network support
- Transaction history

### 5. Transfer System

typescript
transfer.route.ts
↓
transfer.controller.ts (State Machine)
↓
transfer.crud.ts
↓
transfer.model.ts
↓
transfer.schema.ts




Transfer Types:
- Email transfers
- Wallet transfers
- Batch transfers
- Bank withdrawals
- Offramp operations

### 6. Real-time Notifications

typescript
notifications.service.ts
├── Pusher integration
├── Channel management
├── Event handling
└── Message formatting



## 🔄 Data Flow

### 1. User Interaction Flow


mermaid
sequenceDiagram
User->>Bot: /start
Bot->>MenuService: Initialize
MenuService->>SessionManager: Check Auth
SessionManager-->>MenuService: Auth Status
MenuService-->>User: Display Menu


### 2. Authentication Flow


mermaid
sequenceDiagram
User->>AuthRoute: Login Request
AuthRoute->>AuthController: Handle Login
AuthController->>AuthCrud: Request OTP
AuthCrud-->>User: Send OTP
User->>AuthController: Submit OTP
AuthController->>SessionManager: Store Token



### 3. Transfer Flow


mermaid
sequenceDiagram
User->>TransferRoute: Transfer Request
TransferRoute->>TransferController: Initialize Transfer
TransferController->>WalletController: Check Balance
WalletController-->>TransferController: Balance OK
TransferController->>TransferCrud: Execute Transfer
TransferCrud-->>User: Confirmation




## 🔐 Security Architecture

### 1. Session Management


typescript
SessionManager
├── Token storage
├── Expiration handling
├── Secure persistence
└── Auto cleanup



### 2. Rate Limiting


typescript
RateLimiter
├── API request limits
├── Message rate control
├── Login attempt limits
└── Error handling



## 📡 External Integrations

### 1. Copperx API
- RESTful endpoints
- Authentication
- Transaction processing
- Account management

### 2. Pusher Integration

typescript
NotificationsService
├── Private channels
├── Authentication
├── Real-time events
└── Error handling



## 🔄 State Management

### 1. User States

typescript
UserState
├── Authentication state
├── Transfer state
├── Menu state
└── Temporary data


### 2. Session Persistence
- File-based storage
- Auto-save on shutdown
- Load on startup
- Error recovery

## 🛠️ Error Handling

### 1. Global Error Handling

typescript
try {
// Operation
} catch (error) {
// Structured error handling
// User feedback
// Logging
}


### 2. Recovery Mechanisms
- Auto-retry for API calls
- Session recovery
- Graceful degradation

## 📊 Logging and Monitoring

### 1. Debug Mode
- API request/response logging
- State transitions
- Error details
- Performance metrics

### 2. Production Logging
- Critical errors
- Security events
- User actions
- System health

## 🔄 Update Flow


### 2. Recovery Mechanisms
- Auto-retry for API calls
- Session recovery
- Graceful degradation

## 📊 Logging and Monitoring

### 1. Debug Mode
- API request/response logging
- State transitions
- Error details
- Performance metrics

### 2. Production Logging
- Critical errors
- Security events
- User actions
- System health

## 🔄 Update Flow


mermaid
graph TD
A[User Input] --> B[Message Handler]
B --> C{State Check}
C -->|Auth State| D[Auth Flow]
C -->|Transfer State| E[Transfer Flow]
C -->|Menu State| F[Menu Flow]



## 🎯 Future Architecture Considerations

1. Database Integration
2. Caching Layer
3. Multi-language Support
4. Enhanced Security Features
5. Metrics Collection





