# Complete Setup Guide

## Overview

This guide walks you through setting up the complete hybrid wallet system for x402 resource payments.

## Prerequisites

- Node.js 18+ and Yarn
- Supabase CLI
- Accounts:
  - Coinbase CDP account
  - WalletConnect account (free)

## Step-by-Step Setup

### 1. Database Setup

Reset your local Supabase database to apply migrations:

```bash
yarn supabase:reset
```

This creates all necessary tables:
- `resources` - x402 resource catalog
- `resource_requests` - Request/payment logs
- `user_balances` - User credit tracking
- `alchemy_events` - Blockchain event logs
- Plus dispute resolution tables

### 2. Get WalletConnect Project ID

Users need to connect their wallets. Get a free Project ID:

1. Go to https://cloud.walletconnect.com/
2. Sign up (free)
3. Create a new project
4. Copy your Project ID

Add to `.env.local`:
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
```

### 3. Get Coinbase OnchainKit API Key

For Coinbase Smart Wallet support:

1. Go to https://portal.cdp.coinbase.com/
2. Sign in
3. Create an API key for OnchainKit
4. Copy the API key

Add to `.env.local`:
```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-onchainkit-api-key
```

### 4. Set Up Server Wallet (Coinbase CDP)

The server wallet handles automatic payments.

#### Get CDP API Credentials

1. Go to https://portal.cdp.coinbase.com/
2. Create a new API key
3. Download the JSON file (contains API key name and private key)

The file looks like:
```json
{
  "name": "organizations/xxx/apiKeys/yyy",
  "privateKey": "-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
}
```

Add to `.env.local`:
```bash
COINBASE_API_KEY_NAME=organizations/xxx/apiKeys/yyy
COINBASE_API_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
MIHcAgEBBEIB...your-key-here...
-----END EC PRIVATE KEY-----"
```

**Note**: Keep the quotes and line breaks in the private key exactly as shown.

#### Initialize Wallet

Run the wallet initialization script:

```bash
yarn wallet:init
```

This will:
- Create a new wallet on Base Mainnet
- Display the wallet address
- Show current balance
- Generate a wallet ID

**Output example:**
```
✅ Wallet initialized successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wallet ID: abc123-def456-ghi789
Address:   0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5
Network:   Base Mainnet (Chain ID: 8453)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Add this to your .env.local file:
COINBASE_WALLET_ID=abc123-def456-ghi789
```

Add the wallet ID to `.env.local`:
```bash
COINBASE_WALLET_ID=abc123-def456-ghi789
```

#### Fund the Wallet

Send USDC to the wallet address on Base Mainnet:

- **Network**: Base (Chain ID: 8453)
- **Token**: USDC (Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Address**: The address shown by `wallet:init`

You can:
- Bridge from Ethereum/other chains
- Buy directly on Base
- Transfer from Coinbase exchange

**Recommended amount**: Start with $10-50 USDC for testing.

### 5. Add Initial Resources

Seed the WindyBay weather resource:

```bash
yarn seed:resources
```

This will:
- Add WindyBay weather API
- Fetch `.well-known/x402` data
- Extract payment details
- Store in database

### 6. Complete .env.local

Your final `.env.local` should look like:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Wallet Connection (for users)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-onchainkit-api-key

# Server Wallet (for automated payments)
COINBASE_API_KEY_NAME=organizations/xxx/apiKeys/yyy
COINBASE_API_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
...your-key...
-----END EC PRIVATE KEY-----"
COINBASE_WALLET_ID=your-wallet-id

# Optional: Alchemy webhook
ALCHEMY_WEBHOOK_SIGNING_KEY=your-signing-key
ALLOWED_RECIPIENT_ADDRESSES=0x...
```

### 7. Start Development Server

```bash
yarn dev
```

Visit http://localhost:3000

## Testing the Flow

### 1. Connect Your Wallet

1. Click "Connect Wallet" in the top right
2. Choose Coinbase Wallet
3. Approve the connection
4. You should see:
   - Your wallet address (shortened)
   - Your balance (starts at 0 USDC)

### 2. Test a Resource

1. Go to `/resources`
2. Find "WindyBay Weather"
3. Click "Test"
4. Configure request:
   - Path: `/weather`
   - Params: `location=New York`, `date=2025-01-15`
5. Click "Test Request (Auto-Pay if Needed)"

### What Happens:

```
1. Your connected wallet address is sent with request
2. Server wallet pays the resource (background)
3. Transaction is logged with your address
4. Response is returned
5. Your balance is debited (internal accounting)
```

### 3. View Your Transactions

All requests are shown in "Recent Requests" with:
- Your wallet address
- Request details
- Payment tx hash
- Response status

## Troubleshooting

### "Please connect your wallet first"

Click "Connect Wallet" in the top navigation.

### "Invalid wallet address"

Disconnect and reconnect your wallet. Make sure you're using Coinbase Wallet.

### "Coinbase API credentials not configured"

Check your `.env.local`:
- `COINBASE_API_KEY_NAME` is set
- `COINBASE_API_PRIVATE_KEY` is set with proper quotes
- Restart dev server after changes

### "Payment execution not yet fully implemented"

The EIP-712 signing for `transferWithAuthorization` needs to be completed. This is noted in `lib/x402/payment-handler.ts`.

For now, the system logs requests but doesn't actually execute payments.

### Wallet balance shows 0

- Make sure you've connected your wallet
- Balance tracking is internal - it starts at 0
- You can add deposit functionality later

## Next Steps

### For Development

1. **Implement EIP-712 Signing**
   - Complete `lib/x402/payment-handler.ts`
   - Use Coinbase SDK's signing capabilities
   - Test with real USDC payments

2. **Add User Deposits**
   - Create deposit flow (USDC → server wallet)
   - Track deposits in `user_balances`
   - Credit user accounts

3. **Add Balance Requirements**
   - Check balance before requests
   - Reject if insufficient
   - Show deposit prompt

### For Production

1. **Security**
   - Add wallet signature verification
   - Implement rate limiting
   - Add request validation

2. **Monitoring**
   - Track server wallet balance
   - Alert when low
   - Monitor failed payments

3. **User Management**
   - User profiles
   - Transaction history page
   - Deposit/withdrawal flows

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed explanation of the hybrid wallet architecture.

## Support

For issues or questions:
- Check the architecture docs
- Review code comments
- Open an issue on GitHub
