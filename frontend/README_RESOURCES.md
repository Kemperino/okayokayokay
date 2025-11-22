# x402 Resource Proxy System

This system allows you to interact with x402-enabled resources (pay-per-use APIs) with automatic background payment handling via a Coinbase CDP server wallet.

## Architecture

```
User Request → Proxy API → x402 Resource
                 ↓
          Server Wallet (Auto-Pay)
                 ↓
          Database (Log Request/Payment)
```

## Features

- **Automatic Payment Handling**: Server wallet signs transactions in the background
- **Request/Response Logging**: All requests, responses, and payments are logged
- **Resource Management**: Add and manage multiple x402 resources
- **Interactive Testing**: Test resources directly from the UI

## Setup

### 1. Database Migration

The database schema has been updated. Reset your local database:

```bash
yarn supabase:reset
```

### 2. Coinbase CDP Wallet Setup

You need a Coinbase CDP wallet to handle automatic payments.

#### Get API Keys

1. Go to [https://portal.cdp.coinbase.com/](https://portal.cdp.coinbase.com/)
2. Create a new API key
3. Download the credentials (you'll get an API key name and private key)

#### Configure Environment Variables

Add to `.env.local`:

```bash
# Coinbase CDP Configuration
COINBASE_API_KEY_NAME=organizations/xxx/apiKeys/xxx
COINBASE_API_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMIH...xxx...\n-----END EC PRIVATE KEY-----
```

#### Initialize Wallet

Run the initialization script to create your wallet:

```bash
yarn wallet:init
```

This will:
- Create a new wallet on Base Mainnet (or load existing)
- Display the wallet address
- Generate a wallet ID to add to `.env.local`

Add the wallet ID to `.env.local`:

```bash
COINBASE_WALLET_ID=your-wallet-id-here
```

#### Fund the Wallet

Fund the wallet with USDC on Base Mainnet:
- Network: Base (Chain ID: 8453)
- Token: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- Send USDC to the wallet address displayed by the init script

### 3. Seed Initial Resources

Add the WindyBay weather resource as a starter example:

```bash
yarn seed:resources
```

### 4. Start Development Server

```bash
yarn dev
```

Visit http://localhost:3000/resources

## Usage

### Add a Resource

1. Go to `/resources`
2. Click "Add New Resource"
3. Enter:
   - Name (e.g., "Weather API")
   - Description (optional)
   - Base URL (e.g., "https://windybay.okay3.xyz")
4. Click "Add Resource"

The system will automatically:
- Fetch `/.well-known/x402` from the resource
- Extract payment address and pricing info
- Add the resource to your catalog

### Test a Resource

1. Click "Test" on any resource
2. Configure the request:
   - Path (e.g., `/weather`)
   - Query parameters (e.g., `location=New York`, `date=2025-01-15`)
3. Click "Test Request (Auto-Pay if Needed)"

The system will:
1. Make the request to the resource
2. If 402 Payment Required, automatically pay using the server wallet
3. Retry the request with payment proof
4. Log everything to the database
5. Display the response

### View Request History

All proxied requests are logged and displayed in the "Recent Requests" section, showing:
- Request details (path, params)
- Response status
- Payment amount and transaction hash
- Timestamp

## API Endpoints

### List Resources

```bash
GET /api/resources
```

### Create Resource

```bash
POST /api/resources
{
  "name": "Weather API",
  "description": "Get weather data",
  "baseUrl": "https://example.com"
}
```

### Proxy Request to Resource

```bash
POST /api/proxy-resource
{
  "resourceId": "uuid-here",
  "path": "/weather",
  "params": {
    "location": "New York",
    "date": "2025-01-15"
  }
}
```

Or via GET:

```bash
GET /api/proxy-resource?resourceId=xxx&path=/weather&location=New%20York&date=2025-01-15
```

## Database Schema

### `resources` Table

Stores x402 resource catalog:
- `id`, `name`, `description`
- `base_url`, `well_known_url`
- `well_known_data` (cached .well-known/x402)
- `payment_address`, `price_per_request`
- `is_active`

### `resource_requests` Table

Logs all proxied requests:
- `resource_id`, `request_path`, `request_params`
- `response_data`, `response_status`
- `tx_hash`, `payment_amount`, `payment_to_address`, `nonce`
- `status` (pending, paid, completed, failed)

## User Wallet vs Server Wallet

### Server Wallet (Current Implementation)

- **Pros**: Automatic background payments, no user interaction needed
- **Cons**: Server must be funded, server controls funds
- **Use Case**: Application-managed resource access

### User Wallet (Alternative)

If you want users to pay with their own wallets:
1. Remove server wallet code
2. Add wallet connection (Coinbase Wallet, WalletConnect)
3. Users sign transactions manually for each payment

This requires manual approval for each request (not "background").

## Troubleshooting

### "Coinbase API credentials not configured"

Make sure you've added `COINBASE_API_KEY_NAME` and `COINBASE_API_PRIVATE_KEY` to `.env.local`

### "Payment execution not yet fully implemented"

The payment handler in `lib/x402/payment-handler.ts` has placeholder code for EIP-712 signing. You may need to implement the actual signing logic based on the Coinbase SDK's capabilities.

### Resource not showing payment info

Check if the resource has a valid `/.well-known/x402` endpoint. You can fetch it manually:

```bash
curl https://windybay.okay3.xyz/.well-known/x402
```

## Next Steps

1. Implement full EIP-712 signing for `transferWithAuthorization`
2. Add user wallet connection as an alternative to server wallet
3. Add resource usage limits and rate limiting
4. Implement user billing (charge users for proxy usage)
5. Add dispute resolution integration
