# Confirm Escrow Webhook Setup

## Overview

The `confirm-escrow` webhook endpoint monitors USDC transfers to your escrow addresses and validates that they were made via `transferWithAuth` (EIP-3009).

## How It Works

### Workflow

1. **Alchemy monitors blockchain** - Custom GraphQL webhook watches for USDC Transfer events to specific addresses
2. **Webhook fires** - When a transfer matches, Alchemy sends payload to your endpoint
3. **Backend validates** - `confirm-escrow` API route checks for `AuthorizationUsed` event in the same transaction
4. **Calls confirmEscrow on-chain** - Uses operator private key to call `confirmEscrow()` on the DisputeEscrow contract
5. **Logs details** - Transaction hash, addresses, amount, authorizer, nonce, and confirmation tx hash are logged

### Why This Design?

- **On-chain filtering (Alchemy):** Reduces noise by only triggering on transfers to your watchlist addresses
- **App validation (Next.js API):** Ensures the transfer was via `transferWithAuth`, not a regular ERC-20 transfer
- **Simple configuration:** Watchlist is configured **only** in Alchemy's GraphQL query—no environment variables needed

## Setup Instructions

### 1. Configure Environment Variables

Add this to your `.env.local` file:

```bash
# Operator private key (must have operator role on DisputeEscrow contract)
OPERATOR_PRIVATE_KEY=0xYourPrivateKeyHere
```

**Security Note:** The `OPERATOR_PRIVATE_KEY` is server-side only and will never be exposed to the client.

**Note:** The escrow contract address is automatically extracted from the webhook payload (the `to` address in the USDC transfer).

### 2. Identify Your Escrow Addresses

These are the addresses that will receive USDC payments via `transferWithAuth`. For example:
- Your dispute escrow contract address
- Your merchant payment addresses
- Any other addresses that should trigger escrow confirmation

Example addresses:
```
0x1234567890123456789012345678901234567890
0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

### 3. Generate Alchemy Webhook Query

Run the script with your escrow addresses as arguments:

```bash
yarn generate-webhook 0xAddress1 0xAddress2 0xAddress3
```

This will output a GraphQL query like:
```graphql
{
  block {
    hash
    number
    timestamp
    logs(
      filter: {
        addresses: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"]
        topics: [
          ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
          []
          [
            "0x000000000000000000000000<your-address-1-padded>"
            "0x000000000000000000000000<your-address-2-padded>"
          ]
        ]
      }
    ) {
      account { address }
      topics
      data
      index
      transaction {
        hash
        from { address }
        to { address }
        status
        logs {
          account { address }
          topics
          data
          index
        }
      }
    }
  }
}
```

### 4. Configure Alchemy Webhook

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Select your **Base** network app
3. Navigate to **Notify** → **Custom Webhooks**
4. Click **Create Webhook**
5. Choose **GraphQL** webhook type
6. Paste the generated query from step 3
7. Set the webhook URL:
   - **Production:** `https://your-app.vercel.app/api/confirm-escrow`
   - **Local testing:** Use ngrok or similar tunnel service
8. (Optional) Configure signing key for security
9. Save and activate the webhook

### 5. Test the Webhook

**Local Testing:**
```bash
# Start ngrok tunnel
ngrok http 3000

# Update Alchemy webhook URL to ngrok URL
# Make a test USDC transfer with transferWithAuth to one of your watchlist addresses
# Check your local console for logs
```

**Production Testing:**
- Deploy to Vercel
- Update Alchemy webhook URL to production URL
- Make a test transfer
- Check Vercel logs

## API Response Format

### Success (valid transfers found)
```json
{
  "ok": true,
  "message": "Processed 1 valid transfer(s)",
  "processed": 1,
  "transfers": [
    {
      "txHash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "amount": "10000",
      "authorizer": "0x...",
      "nonce": "0x...",
      "blockNumber": 12345678,
      "confirmTxHash": "0x...",
      "confirmSuccess": true
    }
  ]
}
```

**Response Fields:**
- `txHash` - The USDC transfer transaction hash
- `from` - The sender (buyer) address
- `to` - The recipient (escrow) address
- `amount` - USDC amount in raw units (6 decimals)
- `authorizer` - The account that authorized the transfer
- `nonce` - The unique identifier (used as requestId)
- `blockNumber` - Block number of the transfer
- `confirmTxHash` - Transaction hash of the on-chain confirmEscrow call
- `confirmSuccess` - Whether the on-chain confirmation succeeded

### No valid transfers
```json
{
  "ok": true,
  "message": "No valid transfers found",
  "processed": 0
}
```

### Error
```json
{
  "error": "Internal server error",
  "message": "Error description"
}
```

## Understanding the Addresses

### Address Padding

Ethereum event topics are 32 bytes, but addresses are only 20 bytes. So addresses in topics are left-padded with zeros.

**Original address:**
```
0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

**Padded for topics (32 bytes):**
```
0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

The `generate-webhook` script handles this automatically.

### Logged Addresses

The webhook logs these addresses for each valid transfer:

- **`from`:** The sender of the USDC (the payer/buyer)
- **`to`:** The recipient of the USDC (your escrow address)
- **`authorizer`:** The account that authorized the transfer (from `AuthorizationUsed` event)
- **`nonce`:** The unique identifier for this authorization (used as requestId in confirmEscrow)

### On-Chain Confirmation

For each valid transfer, the webhook automatically calls `confirmEscrow(requestId, buyer, amount, apiResponseHash)` on the DisputeEscrow contract at the `to` address:

- **Contract Address:** The `to` address from the USDC transfer (the escrow contract that received the funds)
- **requestId:** The nonce from the transferWithAuth (32 bytes)
- **buyer:** The sender address (from address in the USDC transfer)
- **amount:** The USDC amount transferred (in raw units, 6 decimals)
- **apiResponseHash:** Set to `0x0000...` (placeholder for now)

The operator account (from `OPERATOR_PRIVATE_KEY`) must have the necessary permissions on the contract to call this function.

## Event Signatures Reference

```typescript
// ERC-20 Transfer event
// keccak256("Transfer(address,address,uint256)")
TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// EIP-3009 AuthorizationUsed event
// keccak256("AuthorizationUsed(address,bytes32)")
AUTHORIZATION_USED = '0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5'
```

## Security Considerations

1. **Validate webhook source:** Consider implementing Alchemy signature validation (similar to `alchemy-webhook` route)
2. **Rate limiting:** Add rate limiting to prevent abuse
3. **Authentication:** If needed, add authentication to restrict access
4. **HTTPS only:** Always use HTTPS in production

## Troubleshooting

**Webhook not firing:**
- Verify addresses in GraphQL query are correctly padded
- Check Alchemy webhook is active
- Ensure you're testing on Base network
- Verify USDC contract address is correct (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)

**"No valid transfers found":**
- Check if transaction actually contains `AuthorizationUsed` event
- Verify it's a `transferWithAuth` call, not a regular ERC-20 transfer
- Check Vercel/local logs for detailed messages

**Invalid webhook payload:**
- Ensure Alchemy is sending the correct GraphQL structure
- Check for network/API changes from Alchemy

## Next Steps

After setting up the webhook, you may want to:

1. Store transfer data in your database (Supabase)
2. Update escrow status in your smart contract
3. Trigger notifications to users
4. Start dispute resolution workflows

See the existing `alchemy-webhook` route for an example of database integration.
