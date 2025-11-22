# okayokayokay

Dispute resolution platform for x402 payments with multi-layer arbitration.

## Overview

A decentralized escrow and dispute resolution system for x402 (HTTP 402 Payment Required) transactions. Service providers register and receive individual escrow contracts that handle payment settlement, dispute management, and fund distribution.

## Workflow

1. **Service Registration**: Service providers register through the factory contract, deploying a dedicated escrow contract
2. **Payment Flow**:
   - Buyer makes x402 payment through facilitator
   - Funds are transferred to the service's escrow contract
   - Operator confirms the transaction with API response hash
3. **Dispute Resolution**:
   - **Layer 1**: Direct resolution between buyer and seller (10-minute window)
   - **Layer 2**: Centralized dispute agent arbitration (2-day escalation window)
   - **Layer 3**: (Future) Decentralized jury/Kleros integration

## Architecture

- **Frontend**: Next.js customer/merchant dashboard
- **Smart Contracts**: Factory pattern with per-service escrow contracts
- **Backend**: Alchemy webhooks for blockchain event tracking
- **Database**: Supabase for transaction and dispute data

## Payment Settlement Flow

The complete end-to-end payment settlement system handles x402 payment negotiation, fund transfers, and escrow management. Furthermore we handle dispute and dispute resolution.

### 1. Customer Request Initiation

**Files**: `frontend/app/resources/page.tsx`, `frontend/components/ResourceTester.tsx`

The customer interacts with the dashboard to request data from an x402-enabled resource. The system initiates a new session wallet through Coinbase CDP.

```
Customer Input
  ↓ (selects resource and parameters)
Browser Session
  ↓ (generateSessionId via frontend/lib/cdp/session-wallet.ts)
CDP Anonymous Wallet
  ↓ (stored in Supabase session_wallets table)
Ready for x402 payment
```

### 2. X402 Payment Negotiation

**Files**: `frontend/app/api/proxy-resource/route.ts`, `frontend/lib/x402/payment-handler.ts`

The frontend server receives the request and initiates x402 payment negotiation:

1. **Request Handler** (`frontend/app/api/proxy-resource/route.ts`):

   - Receives POST request with `resourceId`, `path`, `params`, `sessionId`
   - Validates resource exists in database
   - Fetches resource's `.well-known/x402` metadata for payment requirements and seller information
   - Calls `makeX402RequestForSession()` to handle payment

2. **X402 Payment Middleware** (`frontend/lib/x402/payment-handler.ts`):
   ```
   Initial GET → 402 PaymentRequired
     ↓ (extracts payment requirements: amount, recipient, network)
   Creates EIP-3009 transferWithAuthorization payload
     ↓ (nonce = request_id, from = buyer, to = escrow, amount)
   Signs with CDP Account private key
     ↓ (signature proves authorization)
   Sends X-PAYMENT header to resource
     ↓ (transfers funds via USDC transferWithAuth)
   Server validates signature
     ↓ (verifies nonce, authorizer, recipient)
   Returns x402 resource response
     ↓ (extracts x-payment-response header)
   ```

### 3. Session Wallet Management

**Files**: `frontend/lib/cdp/session-wallet.ts`, `frontend/lib/cdp/session-wallet-operations.ts`

Each browser session gets a unique CDP wallet for anonymous x402 payments:

- **Session ID Generation** (`generateSessionId`): Creates browser-persistent session identifier (localStorage)
- **Wallet Creation** (`getOrCreateAnonymousWallet`):
  - Calls Coinbase CDP API to create account
  - Stores wallet in Supabase `session_wallets` table: `{ session_id, cdp_wallet_name, wallet_address }`
  - Returns `EvmServerAccount` for signing x402 payments
- **Balance Queries** (`getSessionWalletAddress`, `getSessionUsdcBalance`): Uses viem public client to read blockchain state

### 4. Resource Request Recording

**Files**: `frontend/app/api/proxy-resource/route.ts`

After successful x402 payment, the request is recorded in the database:

Supabase `resource_requests` table stores:

- `request_id` (text): 32-byte unique identifier (becomes EIP-3009 nonce)
- `user_address` (text): Buyer's wallet address
- `seller_address` (text): Merchant's public key
- `input_data` (jsonb): Query parameters sent to resource
- `output_data` (jsonb): API response received
- `seller_description` (jsonb): Cached `.well-known/x402` data
- `tx_hash` (text): Payment transaction hash on blockchain
- `resource_url` (text): Resource endpoint URL
- `status` (text): 'pending' → 'completed' or 'failed'
- `created_at`, `completed_at`: Timestamps

### 5. Blockchain Event Observation

**Files**: `frontend/app/api/alchemy-webhook/route.ts`

The operator runs a webhook listener that observes blockchain token transfers:

1. **Webhook Reception**:

   - Alchemy sends webhook when `AuthorizationUsed` event is emitted (EIP-3009 signature)
   - Validates webhook signature using HMAC-SHA256 (if `ALCHEMY_WEBHOOK_SIGNING_KEY` configured)

2. **Event Parsing**:

   - Searches for `AuthorizationUsed` event from USDC contract
   - Extracts indexed event data:
     - **Authorizer** (topic 1) = Buyer wallet address
     - **Nonce** (topic 2) = 32-byte request ID (same as `request_id` in `resource_requests`)
   - Finds paired `Transfer` event in same transaction
   - Extracts `from`, `to`, `amount` from Transfer event logs

3. **Validation & Storage**:
   - Validates `toAddress` is in `ALLOWED_RECIPIENT_ADDRESSES` allowlist
   - Stores in Supabase `alchemy_events` table:
     ```
     {
       tx_hash, block_number, network,
       type: 'AuthorizationUsed',
       authorizer, nonce, from_address, to_address, amount,
       raw_payload: {...full webhook}
     }
     ```

**Event Data Flow**:

```
User signs transferWithAuthorization(from=buyer, to=escrow, amount, nonce=requestId)
  ↓ (sent to USDC contract)
USDC contract emits AuthorizationUsed(authorizer, nonce)
  ↓ (also emits Transfer(from, to, amount))
Blockchain confirms transaction
  ↓
Alchemy webhook triggered
  ↓
POST /api/alchemy-webhook
  ↓
Operator records event in alchemy_events table
```

### 6. Escrow Confirmation (Operator Action)

**Files**: `contracts/src/DisputeEscrow.sol`

The operator observes the `alchemy_events` table and calls `confirmEscrow` on the smart contract:

**Function**: `confirmEscrow(requestId, buyer, amount, apiResponseHash)`

- **Parameters**:
  - `requestId`: From `alchemy_events.nonce` (32-byte identifier)
  - `buyer`: From `alchemy_events.authorizer` (buyer wallet address)
  - `amount`: From `alchemy_events.amount` (USDC transferred)
  - `apiResponseHash`: Hash of the resource's API response
- **Action**:
  - Validates request doesn't already exist in escrow
  - Checks contract has sufficient unallocated USDC balance
  - Creates `ServiceRequest` struct with status = `Escrowed`
  - Sets dispute window deadline to 30 minutes from now
  - Emits `EscrowConfirmed` event

**Key Points**:

- `confirmEscrow` matches payment event with escrow creation
- Funds are already in contract (transferred via USDC `transferWithAuth`)
- `allocatedBalance` tracks funds in active escrows
- `nextDeadline` = 30 minutes for buyer to dispute
- Event emission allows frontend to react to on-chain state changes

### 7. Frontend On-Chain State Reading

**Files**: `frontend/lib/contracts/status-queries.ts`, `frontend/app/disputes/page.tsx`

The frontend reads the escrow state from the smart contract using viem public client:

**Query Functions**:

- `getEscrowAddressForService(serviceAddress)`: Returns escrow contract address for a specific service provider
- `getRequestDetails(requestId, escrowAddress)`: Reads the complete `ServiceRequest` struct from contract
- `getRequestDetailsWithMetadata(requestId, escrowAddress)`: Adds computed fields:
  - `canOpenDispute`: Boolean (within 30-minute window and status=Escrowed?)
  - `canSellerRespond`: Boolean (within 10-minute response window?)
  - `canReleaseEscrow`: Boolean (deadline passed and no active dispute?)
  - `timeUntilDeadline`: Remaining seconds for action

**Usage in Dashboard** (`frontend/app/disputes/page.tsx`):

```typescript
// Fetch request ID from DB
const requestId = hexToBytes(transaction.request_id);

// Query smart contract
const onChainStatus = await getRequestDetails(requestId, escrowAddress);

// Use contract state as authoritative source
// (overrides DB status if diverged)
```

### 8. Request Status Lifecycle

**Smart Contract States** (`RequestStatus` enum in DisputeEscrow.sol):

```
ServiceInitiated (0)
  ↓ (payment confirmed)
Escrowed (1)
  ├─ (30 minute dispute window)
  ├─ (no dispute filed) → releaseEscrow() → EscrowReleased (2)
  │                                          ↓ (seller receives funds)
  └─ (buyer files dispute) → openDispute() → DisputeOpened (3)
                                ↓ (10 minute seller response window)
                              ├─ (seller accepts) → respondToDispute(true) → SellerAccepted (4)
                              │                                              ↓ (buyer refunded)
                              └─ (seller rejects) → respondToDispute(false)
                                                    (buyer has 2 days to escalate)
                                                    ↓
                                    escalateDispute() → DisputeEscalated (5)
                                                        ↓ (agent voting phase)
                                    agent.resolveDispute() → DisputeResolved (6)
                                                              ↓ (funds distributed)
```

### 9. Dispute Filing & Escalation

**Files**: `frontend/lib/contracts/dispute-actions.ts`

Buyers can file disputes and escalate to agents:

- **`openDispute(sessionId, params)`**:

  - Encodes call to `openDispute(requestId)` on smart contract
  - Sends transaction via CDP account
  - Changes status: Escrowed → DisputeOpened
  - Sets deadline: now + 10 minutes for seller response

- **`escalateDispute(sessionId, params)`**:
  - Encodes call to `escalateDispute(requestId)`
  - Buyer must escalate after seller rejects and within 2-day window
  - Changes status: DisputeOpened → DisputeEscalated
  - Triggers agent voting phase

### 10. Seller Response & Refunds

**Files**: `frontend/lib/contracts/merchant-actions.ts`

Sellers respond to disputes within the response window:

- **`respondToDispute(params, config)`**:

  - Uses wagmi + WalletConnect for seller's wallet
  - Encodes `respondToDispute(requestId, acceptRefund)`
  - If `acceptRefund=true`:
    - Buyer refunded immediately
    - Status: SellerAccepted
    - Funds transferred from escrow to buyer
  - If `acceptRefund=false`:
    - Dispute remains open
    - Buyer has 2 days to escalate to agents

- **`releaseEscrow(params, config)`**:
  - Permissionless function - anyone can call
  - Releases escrow to seller after dispute window expires
  - Decrements `allocatedBalance`

### 11. Realtime Updates

**Files**: `frontend/components/events/RealtimeResourceRequests.tsx`

The dashboard updates in real-time using Supabase subscriptions:

- Subscribes to `resource_requests` table for INSERT/UPDATE events
- Listens for `alchemy_events` changes
- Updates display when:
  - New payment request created
  - Payment transaction recorded
  - Escrow confirmed on-chain

## Frontend Dispute Components

The frontend provides dedicated dashboards and action handlers for buyers and sellers to interact with disputes.

### Buyer Dispute Interface

**Location**: `/disputes` route

**Components**: `BuyerDisputes.tsx`, `BuyerDisputesWrapper.tsx`

**Features**:

- Displays all buyer transactions with on-chain status
- Filter tabs: All, Unresolved, In Dispute
- Shows transaction cards with dispute status badges
- Queries smart contract for authoritative state via `getRequestDetailsWithMetadata()`

**Buyer Dispute Actions**:

1. **File Dispute** - Opens dispute within 30-minute window after payment

   - Function: `openDispute(sessionId, { requestId, escrowAddress, claimDescription })`
   - File: `frontend/lib/contracts/dispute-actions.ts`
   - Uses: CDP wallet (no MetaMask)
   - Changes status: `Escrowed` → `DisputeOpened`

2. **Escalate Dispute** - Escalates to agents when seller rejects or times out

   - Function: `escalateDispute(sessionId, { requestId, escrowAddress })`
   - File: `frontend/lib/contracts/dispute-actions.ts`
   - Condition: Seller rejected AND within 2-day escalation window
   - Changes status: `DisputeOpened` → `DisputeEscalated`

3. **Cancel Dispute** - Withdraws filed dispute

   - Function: `cancelDispute(sessionId, { requestId, escrowAddress })`
   - File: `frontend/lib/contracts/dispute-actions.ts`
   - Resets status so seller can release funds

4. **Early Release** - Immediately releases funds to seller (satisfaction)
   - Function: `earlyReleaseEscrow(sessionId, { requestId, escrowAddress })`
   - File: `frontend/lib/contracts/dispute-actions.ts`
   - Permissionless - buyer can release at any time

---

### Merchant/Seller Dispute Interface

**Location**: `/merchant` route (requires wallet connection)

**Components**: `MerchantDashboard.tsx`, `MerchantResourceRequests.tsx`, `MerchantTransactions.tsx`

**Features**:

- Requires wagmi wallet connection (MetaMask, Coinbase Wallet, etc.)
- Summary cards: Total Requests, Active, Completed, Failed
- Lists both x402 resource requests and escrow transactions
- Highlights disputed transactions with status indicators
- Queries contract for permission checks via `getRequestDetailsWithMetadata()`

**Merchant Dispute Actions**:

1. **Respond to Dispute** - Accept or reject buyer's dispute claim

   - Function: `respondToDispute({ requestId, escrowAddress, acceptRefund: boolean })`
   - File: `frontend/lib/contracts/merchant-actions.ts`
   - Uses: Connected wallet (wagmi)
   - Available: Within 10-minute response window
   - **Accept** (true):
     - Buyer refunded immediately
     - Status: `SellerAccepted`
   - **Reject** (false):
     - Dispute continues
     - Gives buyer 2-day escalation window

2. **Release Escrow** - Releases funds after dispute window expires

   - Function: `releaseEscrow({ requestId, escrowAddress })`
   - File: `frontend/lib/contracts/merchant-actions.ts`
   - Uses: Connected wallet (wagmi)
   - Permissionless - anyone can call when deadline passed
   - Available when:
     - Status `Escrowed` AND 30-minute dispute window expired, OR
     - Status `DisputeOpened` AND seller-reject escalation window passed, OR
     - Status `DisputeOpened` AND buyer didn't escalate within 2 days

3. **Batch Release Escrow** - Releases multiple expired escrows
   - Function: `batchReleaseEscrow(requestParams[])`
   - File: `frontend/lib/contracts/merchant-actions.ts`
   - Uses: Connected wallet (wagmi)
   - Optimization: Releases multiple escrows with 1-second delay between transactions

---

### Permission Checking & Button Visibility

**Query Function**: `getRequestDetailsWithMetadata(requestId, escrowAddress)`

- File: `frontend/lib/contracts/status-queries.ts`
- Returns computed permission flags:
  - `canOpenDispute`: Can buyer file dispute now?
  - `canEscalateDispute`: Can buyer escalate?
  - `canSellerRespond`: Is seller response window active?
  - `canReleaseEscrow`: Can funds be released?
  - `timeUntilDeadline`: Seconds remaining for action

**Usage Example**:

```typescript
const request = await getRequestDetailsWithMetadata(requestId, escrowAddress);

// Conditionally render action buttons
if (request?.canOpenDispute) render("File Dispute");
if (request?.canEscalateDispute) render("Escalate");
if (request?.canSellerRespond) render("Accept", "Reject");
if (request?.canReleaseEscrow) render("Release Escrow");
```

---

### API Endpoints for Dispute Data

**Buyer Transactions**:

```
GET /api/transactions?address={walletAddress}
Returns: { transactions, unresolved, resourceRequests }
```

- File: `frontend/app/api/transactions/route.ts`
- Used by: `BuyerDisputesWrapper` component
- Fetches buyer's escrow transactions and unresolved disputes

**Merchant Transactions**:

```
GET /api/merchant/transactions?seller={address}&contract={contractAddress}
Returns: { transactions, active }
```

- File: `frontend/app/api/merchant/transactions/route.ts`
- Used by: `MerchantDashboard` component
- Fetches merchant's resource requests (active and completed)

---

### Transaction Flow Examples

**Buyer Opens Dispute Flow**:

```
User clicks "File Dispute" button (in BuyerDisputes)
  ↓
openDispute(sessionId, { requestId, escrowAddress })
  ↓
Get CDP account for session
  ↓
Encode: openDispute(bytes32 requestId, string claimDescription)
  ↓
Send via CDP SDK (no MetaMask)
  ↓
Smart Contract: Update status Escrowed → DisputeOpened
  ↓
Return transaction hash
  ↓
Update UI with success message and hash
```

**Merchant Responds to Dispute Flow**:

```
User clicks "Accept & Refund" or "Reject" (in MerchantTransactions)
  ↓
respondToDispute({ requestId, escrowAddress, acceptRefund })
  ↓
wagmi's writeContract() called
  ↓
MetaMask/WalletConnect dialog appears
  ↓
User signs transaction (pays gas)
  ↓
Smart Contract: Update status and funds
  ↓
Return transaction receipt
  ↓
Update UI with success message and hash
```

---

### Component Hierarchy

```
/app/disputes/page.tsx [Buyer]
  └── BuyerDisputesWrapper (fetches data)
      └── BuyerDisputes (renders UI)
          ├── Filter tabs (All, Unresolved, Disputed)
          ├── Transaction cards
          └── Action buttons:
              • File Dispute [openDispute]
              • Escalate [escalateDispute]
              • Cancel [cancelDispute]
              • Early Release [earlyReleaseEscrow]

/app/merchant/page.tsx [Merchant]
  ├── WalletConnectButton
  └── MerchantDashboard (when wallet connected)
      ├── Summary cards
      ├── Active section
      │   └── MerchantResourceRequests
      │       ├── x402 request cards
      │       └── Release buttons
      └── All section
          └── MerchantTransactions
              ├── Escrow transaction cards
              ├── Dispute indicators
              └── Action buttons:
                  • Accept & Refund [respondToDispute(true)]
                  • Reject [respondToDispute(false)]
                  • Release Escrow [releaseEscrow]
                  • Batch Release [batchReleaseEscrow]
```

## Key Data Structures Reference

### Database Tables

| Table               | Purpose                          | Key Fields                                                                              |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `session_wallets`   | Anonymous CDP wallet mapping     | `session_id`, `wallet_address`, `cdp_wallet_name`                                       |
| `resource_requests` | X402 API call records            | `request_id`, `user_address`, `seller_address`, `input_data`, `output_data`, `tx_hash`  |
| `alchemy_events`    | Blockchain token transfer events | `tx_hash`, `authorizer`, `nonce`, `from_address`, `to_address`, `amount`, `raw_payload` |
| `transactions`      | High-level dispute tracking      | `request_id`, `buyer_id`, `seller_id`, `amount`, `status`, `resource_url`               |
| `disputes`          | Dispute claims and resolution    | `transaction_id`, `filed_by`, `claim_description`, `evidence`, `resolved_in_favor_of`   |
| `dispute_agents`    | Agent reputation and stakes      | `user_id`, `stake_amount`, `successful_votes`, `reputation_score`                       |

### Smart Contract Structs (DisputeEscrow.sol)

**ServiceRequest** struct fields:

- `buyer`: Buyer's wallet address
- `amount`: USDC amount in escrow
- `escrowedAt`: Timestamp when confirmed
- `nextDeadline`: Context-dependent deadline (dispute window, response window, or escalation window)
- `status`: Current request status (RequestStatus enum: 0-6)
- `apiResponseHash`: Operator-set hash of the resource response
- `disputeAgent`: Assigned agent address if escalated
- `buyerRefunded`: Boolean flag indicating if buyer was refunded
- `sellerRejected`: Boolean flag indicating if seller rejected the dispute

**RequestStatus** enum values:

- `0 - ServiceInitiated`: Payment pending
- `1 - Escrowed`: Payment received, in 30-minute dispute window
- `2 - EscrowReleased`: Dispute window passed, funds released to seller
- `3 - DisputeOpened`: Buyer filed claim, in 10-minute seller response window
- `4 - SellerAccepted`: Seller accepted refund
- `5 - DisputeEscalated`: Escalated to agent voting phase
- `6 - DisputeResolved`: Agents voted, funds distributed

## Environment Variables

### Frontend (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Coinbase CDP (for wallet creation and signing)
CDP_API_KEY_ID=your-cdp-key-id
CDP_API_KEY_SECRET=your-cdp-secret

# Blockchain RPC & Contracts
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org  # Base mainnet or custom RPC
NEXT_PUBLIC_DISPUTE_ESCROW_FACTORY_ADDRESS=0x...   # Factory contract address

# Escrow Settings
ALLOWED_RECIPIENT_ADDRESSES=0x...,0x...            # Comma-separated seller addresses

# Alchemy Webhook
ALCHEMY_WEBHOOK_SIGNING_KEY=your-alchemy-key       # For webhook signature validation
```

### Resources (weather-x402/.env)

```bash
# Merchant Info
ADDRESS=0x...                  # Wallet receiving x402 payments
MERCHANT_PK=0x...              # Private key for signing responses

# Allowed Payers (optional allowlist)
ALLOWED_PAYER_ADDRESSES=0x...,0x...
```

## Development

```bash
yarn install       # Install dependencies
yarn dev          # Run frontend
forge build       # Build contracts
```
