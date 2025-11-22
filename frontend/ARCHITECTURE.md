# Hybrid Wallet Architecture

## The Problem

We need **both**:
1. ✅ **Background payments** - Server can automatically pay for x402 resources
2. ✅ **User identity** - Each transaction linked to a specific user for disputes
3. ✅ **Multi-user support** - Different users with separate balances
4. ✅ **Dispute capability** - Users can dispute transactions they initiated

## The Solution: Hybrid Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ User connects wallet (Coinbase Wallet) → Establishes Identity│
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ User makes request to x402 resource via proxy                │
│ Request includes: userAddress (from connected wallet)        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Server wallet pays resource on user's behalf                 │
│ (Background, no user interaction needed)                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Transaction logged to database:                              │
│ - user_address: Who requested it                             │
│ - tx_hash: Payment transaction                               │
│ - request/response data                                      │
│ - resource details                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ User's internal balance debited                              │
│ (Optional: Can also track credit/debt)                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. **User Wallet** (Wagmi + Coinbase Wallet)
- **Purpose**: User identity and authentication
- **Technology**: Coinbase Smart Wallet (via OnchainKit)
- **User Action**: Connect once at the start of session
- **Stored**: `user_address` in database with each request

#### 2. **Server Wallet** (Coinbase CDP SDK)
- **Purpose**: Execute background payments for x402 resources
- **Technology**: Coinbase CDP (Cloud Development Platform)
- **User Action**: None - fully automated
- **Stored**: `tx_hash` and payment details in database

#### 3. **User Balance Tracking**
- **Table**: `user_balances`
- **Fields**:
  - `balance`: Current internal credit
  - `total_deposited`: Total user deposits
  - `total_spent`: Total spent on resources
- **Purpose**: Track who owes what, enable internal accounting

#### 4. **Request Logging**
- **Table**: `resource_requests`
- **Links**: Each request to `user_address` (connected wallet)
- **Purpose**: Complete audit trail for disputes

## Benefits

### ✅ Background Payments
- Server wallet signs transactions automatically
- No user approval popups for each request
- Fast, seamless UX

### ✅ User Identity
- Every transaction linked to user's wallet address
- Users can see their own transaction history
- Clear accountability

### ✅ Multi-User Support
- Different users have separate balances
- Each user's requests tracked independently
- Supports concurrent users

### ✅ Dispute Resolution
- Complete audit trail: user → request → payment → response
- Users can dispute their own transactions
- Server knows exactly who made each request

## Data Flow Example

### User Request Flow

1. **User connects wallet**
   ```typescript
   address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5"
   isConnected: true
   ```

2. **User tests resource**
   ```json
   POST /api/proxy-resource
   {
     "resourceId": "uuid-123",
     "path": "/weather",
     "params": { "location": "New York" },
     "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5"
   }
   ```

3. **Server processes**
   - Creates `resource_requests` record with `user_address`
   - Resource returns 402 Payment Required
   - **Server wallet** signs `transferWithAuthorization`
   - Payment tx hash: `0xabc...123`
   - Retries request with payment proof
   - Saves response data

4. **Database record**
   ```json
   {
     "id": "req-uuid",
     "resource_id": "uuid-123",
     "user_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb5",
     "request_path": "/weather",
     "request_params": { "location": "New York" },
     "response_data": { "temp": 72, "condition": "sunny" },
     "tx_hash": "0xabc...123",
     "payment_amount": "0.01",
     "status": "completed"
   }
   ```

5. **User balance updated**
   ```json
   {
     "user_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb5",
     "balance": 9.99,
     "total_spent": 0.01
   }
   ```

## Future: User Deposits

Currently, the system tracks internal balances but doesn't require upfront deposits. You can add deposit functionality:

### Option A: USDC Deposits
```
User deposits USDC → Server wallet
Platform tracks: who deposited how much
User balance credited
```

### Option B: Credit/Debit Tracking
```
User starts with 0 balance (or trial credit)
Each request adds to debt
User settles later (Stripe, crypto, etc.)
```

## Comparison: Pure Server Wallet vs Hybrid

### Pure Server Wallet ❌
```
Server wallet pays
No user identity
Can't link to specific users
Can't dispute
```

### Pure User Wallet ❌
```
Users sign every transaction
Can dispute
BUT: No background payments
Requires popup approval each time
```

### Hybrid Architecture ✅
```
Server wallet pays (background)
User identity tracked (connected wallet)
Full audit trail
Can dispute
Multi-user support
Best of both worlds
```

## Implementation Details

### Database Schema

```sql
-- User balances (internal accounting)
create table user_balances (
  user_address text primary key,
  balance numeric default 0,
  total_deposited numeric default 0,
  total_spent numeric default 0
);

-- Resource requests (linked to users)
create table resource_requests (
  id uuid primary key,
  resource_id uuid references resources(id),
  user_address text not null, -- Connected wallet
  tx_hash text, -- Server wallet payment
  payment_amount text,
  status text,
  -- ... other fields
);
```

### Security Considerations

1. **Wallet Address Validation**
   - Always validate `0x` prefix and 42 character length
   - Store addresses in lowercase for consistency

2. **Balance Protection**
   - Check balance before making requests (optional)
   - Deduct balance after successful payment
   - Track total spent for audit

3. **Request Authorization**
   - Verify user owns the wallet address (via signature in production)
   - For now: Trust client-side wallet connection
   - TODO: Add signature verification for production

## Setup Requirements

### 1. User Wallet (Coinbase Wallet)
- Get WalletConnect Project ID: https://cloud.walletconnect.com/
- Get OnchainKit API Key: https://portal.cdp.coinbase.com/

### 2. Server Wallet (Coinbase CDP)
- Get CDP API credentials: https://portal.cdp.coinbase.com/
- Create wallet: `yarn wallet:init`
- Fund wallet with USDC on Base

### 3. Environment Variables
```bash
# User wallet connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_ONCHAINKIT_API_KEY=...

# Server wallet
COINBASE_API_KEY_NAME=...
COINBASE_API_PRIVATE_KEY=...
COINBASE_WALLET_ID=...
```

## Summary

**The hybrid architecture gives you the best of both worlds:**

- ✅ Users connect their wallet for identity
- ✅ Server wallet handles payments in background
- ✅ Every transaction is linked to a user
- ✅ Users can dispute transactions
- ✅ Multi-user support with separate balances
- ✅ Complete audit trail for compliance

This is the correct approach for a dispute resolution platform with automated x402 payments.
