# okayokayokay

Dispute resolution platform for x402 payments with multi-layer arbitration.

## Project Structure

- `frontend/` - Next.js customer/merchant interface
- `resources/` - x402 resources (Vercel serverless functions)
- `contracts/` - Dispute escrow smart contracts

## Core Entities

**Buyer** - Initiates requests via agent interface, selects x402 resources, pays for usage

**Seller/Resource** - Provides x402-paid services

**Facilitator** - Executes `transferWithAuth`, routes payments to dispute escrow

**Dispute Escrow Contract** - Tracks request status through dispute pipeline

**Dispute Agent** - Stakes to arbitrate disputes, votes on escalated cases, earns rewards

**Keeper** - Permissionless role that executes fund distribution for resolved disputes (earns small fee)

## Dispute Status Flow

1. **Service Initiated** - Resource selected, x402 PaymentRequired received, no payment yet
2. **Escrowed** - Payment settled, funds in escrow, seller can serve request
3. **EscrowReleased** - Dispute window expired, seller can harvest funds
4. **Dispute Opened** - Buyer files claim on request ID
5. **Seller Accepted** - Seller accepts claim, buyer gets refund
6. **Dispute Escalated** - Seller rejected/timeout, agent voting phase begins
7. **DisputeResolved** - Agents voted, funds distributed to winner (agents get percentage)
8. **Master Review Escalation** - Non-unanimous vote, escalated to governing entity

## Key Identifiers

**Seller ID** - Public key for resource authentication (signs/verifies payloads)

**Request ID** - 32-byte identifier for paid request/case (reused as EIP-3009 nonce)

## User Capabilities

### Customers
- View/filter transactions and disputes
- File disputes (single/multi-transaction)
- Add evidence, track resolution, escalate to higher layers
- Flag transactions as "validated" to expedite escrow release

### Merchants
- View/filter transactions and disputes
- Resolve disputes by accepting claims or proposing alternatives
- Escalate or accept verdicts

### Dashboard (Both)
- Open dispute count
- Transaction volumes (escrowed, disputed, refunded)

## Development

**Package Manager**: This project uses **yarn** for dependency management. Always use `yarn` instead of `npm`.

**Frontend Stack**:
- Next.js for the frontend application
- Supabase for database and authentication (use Supabase client where needed)
- Coinbase CDP Server Wallets v2 for wallet management (see https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart)
  - Check CDP docs when implementing wallet functionality

**Backend Services**:
- Alchemy webhook server function that populates the database with blockchain events

**Documentation**: Do not create markdown files for everything. Only create documentation when explicitly requested or when absolutely necessary for critical setup/configuration.
