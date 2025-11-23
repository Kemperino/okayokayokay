# Dispute Escrow Contract Utilities

Comprehensive utilities for interacting with the DisputeEscrow smart contracts on Base.

## Overview

This library provides type-safe, well-documented functions for:
- **Buyers** (using CDP Server Wallets): Open, escalate, and cancel disputes
- **Merchants** (using wagmi/WalletConnect): Respond to disputes and release funds
- **Both**: Query request status, deadlines, and permissions

## Architecture

```
lib/contracts/
├── DisputeEscrowABI.ts           # Contract ABI with RequestStatus enum
├── DisputeEscrowFactoryABI.ts    # Factory contract ABI with role constants
├── types.ts                      # TypeScript types and helper functions
├── dispute-actions.ts            # Buyer actions using CDP wallets
├── merchant-actions.ts           # Merchant actions using wagmi
├── status-queries.ts             # Read-only queries (no wallet needed)
├── DisputeEscrowContract.ts      # Legacy functions (kept for compatibility)
└── index.ts                      # Main export file
```

## Setup

### Environment Variables

Add to your `.env.local`:

```bash
# Contract addresses
NEXT_PUBLIC_DISPUTE_ESCROW_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org  # Optional, uses default if not set

# CDP credentials (for buyer actions)
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...

# WalletConnect (for merchant actions)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### Installation

Already installed as part of the frontend dependencies:
- `viem` - Ethereum interaction
- `wagmi` - React hooks for Ethereum
- `@coinbase/cdp-sdk` - CDP Server Wallets

## Usage Examples

### 1. Query Request Status (Buyer or Merchant)

```typescript
import { getRequestDetailsWithMetadata, getStatusDescription } from '@/lib/contracts';

// Get full request details with computed metadata
const request = await getRequestDetailsWithMetadata(
  '0x...' as `0x${string}`, // requestId
  '0x...' as `0x${string}`  // escrowAddress
);

if (request) {
  console.log('Status:', request.status);
  console.log('Can open dispute:', request.canOpenDispute);
  console.log('Can escalate:', request.canEscalateDispute);
  console.log('Deadline:', new Date(Number(request.nextDeadline) * 1000));
  console.log('Description:', getStatusDescription(request));
}
```

### 2. Buyer Opens a Dispute (CDP Wallet)

```typescript
'use server';

import { openDispute } from '@/lib/contracts';
import { cookies } from 'next/headers';

export async function handleOpenDispute(requestId: string, escrowAddress: string) {
  // Get session ID from cookie
  const sessionId = cookies().get('session_id')?.value;
  if (!sessionId) throw new Error('No session');

  const result = await openDispute(sessionId, {
    requestId: requestId as `0x${string}`,
    escrowAddress: escrowAddress as `0x${string}`,
  });

  if (result.success) {
    console.log('Dispute opened! Tx:', result.transactionHash);
  } else {
    console.error('Failed:', result.error);
  }

  return result;
}
```

### 3. Buyer Escalates a Dispute (CDP Wallet)

```typescript
'use server';

import { escalateDispute } from '@/lib/contracts';
import { cookies } from 'next/headers';

export async function handleEscalateDispute(requestId: string, escrowAddress: string) {
  const sessionId = cookies().get('session_id')?.value;
  if (!sessionId) throw new Error('No session');

  const result = await escalateDispute(sessionId, {
    requestId: requestId as `0x${string}`,
    escrowAddress: escrowAddress as `0x${string}`,
  });

  return result;
}
```

### 4. Merchant Responds to Dispute (wagmi)

```typescript
'use client';

import { respondToDispute } from '@/lib/contracts';
import { useAccount } from 'wagmi';

export function DisputeResponseButton({ requestId, escrowAddress }: Props) {
  const { isConnected } = useAccount();

  const handleAccept = async () => {
    const result = await respondToDispute({
      requestId: requestId as `0x${string}`,
      escrowAddress: escrowAddress as `0x${string}`,
      acceptRefund: true, // Accept = refund buyer
    });

    if (result.success) {
      alert('Dispute accepted, buyer refunded!');
    }
  };

  const handleReject = async () => {
    const result = await respondToDispute({
      requestId: requestId as `0x${string}`,
      escrowAddress: escrowAddress as `0x${string}`,
      acceptRefund: false, // Reject = buyer can escalate
    });

    if (result.success) {
      alert('Dispute rejected, buyer can escalate.');
    }
  };

  return (
    <>
      <button onClick={handleAccept} disabled={!isConnected}>
        Accept & Refund
      </button>
      <button onClick={handleReject} disabled={!isConnected}>
        Reject
      </button>
    </>
  );
}
```

### 5. Merchant Releases Escrow (wagmi)

```typescript
'use client';

import { releaseEscrow } from '@/lib/contracts';

export async function handleReleaseEscrow(requestId: string, escrowAddress: string) {
  const result = await releaseEscrow({
    requestId: requestId as `0x${string}`,
    escrowAddress: escrowAddress as `0x${string}`,
  });

  if (result.success) {
    alert('Funds released to merchant!');
  } else {
    alert('Error: ' + result.error);
  }

  return result;
}
```

### 6. Check Permissions Before Actions

```typescript
import { getRequestDetailsWithMetadata, canOpenDispute } from '@/lib/contracts';

// Option 1: Use metadata from query
const request = await getRequestDetailsWithMetadata(requestId, escrowAddress);
if (request?.canOpenDispute) {
  // Show "Open Dispute" button
}

// Option 2: Use helper directly
import { getRequestDetails } from '@/lib/contracts';

const request = await getRequestDetails(requestId, escrowAddress);
if (request && canOpenDispute(request)) {
  // Show "Open Dispute" button
}
```

### 7. Batch Query Multiple Requests

```typescript
import { batchGetRequestDetails } from '@/lib/contracts';

const requests = [
  { requestId: '0x...', escrowAddress: '0x...' },
  { requestId: '0x...', escrowAddress: '0x...' },
  // ... more requests
];

const results = await batchGetRequestDetails(requests);

for (const [requestId, details] of results) {
  if (details) {
    console.log(`Request ${requestId}: ${details.status}`);
  }
}
```

## Request Status Flow

```
ServiceInitiated (0)
    ↓ (payment received)
Escrowed (1)
    ↓ (dispute window expires OR early release)
    ├─→ EscrowReleased (2) [FINAL]
    ↓ (buyer opens dispute)
DisputeOpened (3)
    ├─→ (seller accepts) → SellerAccepted (4) [FINAL - buyer refunded]
    ├─→ (seller rejects) → DisputeRejected (5) → buyer can escalate
    ├─→ (seller timeout) → buyer can escalate
    ↓ (buyer escalates)
DisputeEscalated (6)
    ↓ (agent decides)
DisputeResolved (7) [FINAL - funds distributed]
```

## Key Deadlines

| Status | Deadline Meaning | Who Can Act |
|--------|-----------------|-------------|
| Escrowed | Dispute window end | Buyer: open dispute<br>Anyone: release escrow (after deadline) |
| DisputeOpened (seller not responded) | Seller response deadline | Seller: respond<br>Buyer: escalate (after deadline) |
| DisputeOpened (seller rejected) | Buyer escalation deadline (2 days) | Buyer: escalate<br>Anyone: release escrow (after deadline) |

## Helper Functions

### Permission Checks

```typescript
canOpenDispute(request) → boolean
canEscalateDispute(request) → boolean
canMerchantRespond(request) → boolean
canReleaseEscrow(request) → boolean
```

### Display Helpers

```typescript
getStatusDescription(request) → string
getTimeUntilDeadline(request) → bigint  // seconds
toRequestIdHex(requestId) → Hex  // convert string to 0x... format
```

## Request Status Enum

```typescript
enum RequestStatus {
  ServiceInitiated = 0,
  Escrowed = 1,
  EscrowReleased = 2,
  DisputeOpened = 3,
  SellerAccepted = 4,
  DisputeRejected = 5,
  DisputeEscalated = 6,
  DisputeResolved = 7,
}
```

## Best Practices

1. **Always check permissions before showing action buttons**
   ```typescript
   const request = await getRequestDetailsWithMetadata(id, address);
   {request?.canOpenDispute && <OpenDisputeButton />}
   ```

2. **Handle transaction errors gracefully**
   ```typescript
   const result = await openDispute(sessionId, params);
   if (!result.success) {
     toast.error(result.error);
   }
   ```

3. **Show deadline timers to users**
   ```typescript
   const timeLeft = getTimeUntilDeadline(request);
   const hours = Number(timeLeft) / 3600;
   ```

4. **Use batch queries for lists**
   ```typescript
   // Instead of querying one by one in a loop
   const results = await batchGetRequestDetails(allRequests);
   ```

5. **Cache escrow addresses**
   ```typescript
   // Query once and store in DB
   const escrowAddr = await getEscrowAddressForService(merchantAddress);
   // Save to transactions table
   ```

## Testing

### Local Testing

1. Deploy contracts to Base Sepolia
2. Update `.env.local` with Sepolia contract addresses
3. Test buyer flow:
   - Create escrow
   - Open dispute
   - Escalate dispute
4. Test merchant flow:
   - Connect wallet
   - Respond to dispute
   - Release escrow

### Unit Testing

```typescript
import { canOpenDispute, RequestStatus } from '@/lib/contracts';

const mockRequest = {
  status: RequestStatus.Escrowed,
  nextDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
  // ... other fields
};

expect(canOpenDispute(mockRequest)).toBe(true);
```

## Troubleshooting

### "CDP account creation failed"
- Check CDP credentials in `.env.local`
- Verify CDP API key has correct permissions

### "User rejected transaction"
- User cancelled in wallet - this is expected
- Return error gracefully to user

### "Insufficient gas"
- User's wallet needs ETH for gas
- Show clear error message about gas requirements

### "Request doesn't exist"
- Verify requestId and escrowAddress are correct
- Check if request was created on-chain

## Migration from Old Code

If you're using `DisputeEscrowContract.ts` functions:

```typescript
// Old
import { getRequestStatusFromContract } from '@/lib/contracts/DisputeEscrowContract';
const status = await getRequestStatusFromContract(id, address);

// New
import { getRequestStatus } from '@/lib/contracts';
const status = await getRequestStatus(id, address);
```

Legacy functions are still exported for backward compatibility but prefer using the new ones.
