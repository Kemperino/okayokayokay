# Dispute Escrow Scripts

This directory contains all scripts for deploying and interacting with the Dispute Escrow smart contracts.

## Setup Scripts

### `generate-wallet.sh`
Generates a new wallet for deployment or testing.
```bash
./script/generate-wallet.sh
```

### `deploy.sh`
Deploys the factory and mock USDC contracts to Base Sepolia.
```bash
./script/deploy.sh
```

## Backend Operation Scripts

### `backend-operations.sh`
Interactive menu-driven script for all backend operations:
- Register services
- Set roles (operator, dispute agent)
- Manage escrow (fund, confirm, release)
- Handle disputes (open, respond, escalate, resolve)
- Mint test USDC

```bash
./script/backend-operations.sh
```

### Individual Foundry Scripts

#### Service Management
- `RegisterService.s.sol` - Register a new service provider
- `ManageRoles.s.sol` - Set operator, dispute agent roles

#### Escrow Operations
- `EscrowOperations.s.sol` - Fund, confirm, release escrow
- `MintTestUSDCScript` - Mint test USDC tokens

#### Dispute Operations
- `DisputeOperations.s.sol` - Open, respond, escalate, resolve disputes

## Query Scripts

### `query-contracts.sh`
Query contract state without making transactions:
- Check factory roles
- View escrow balances
- Get request status
- Generate request IDs

```bash
./script/query-contracts.sh
```

## Testing

### `test-flow.sh`
Automated test that demonstrates complete flow:
1. Generate test wallets
2. Register service
3. Fund escrow
4. Confirm request
5. Open and handle dispute

```bash
./script/test-flow.sh
```

## Environment Variables

Required in `.env`:
```
PRIVATE_KEY=0x...
FACTORY_ADDRESS=0x...
USDC_ADDRESS=0x...
```

Optional:
```
ADMIN_ADDRESS=0x...
OPERATOR_ADDRESS=0x...
DISPUTE_AGENT_ADDRESS=0x...
```

## Common Operations

### Register a New Service
```bash
SERVICE_PUBLIC_KEY=0x... \
SERVICE_METADATA_URI="ipfs://..." \
forge script script/RegisterService.s.sol:RegisterServiceScript \
    --rpc-url https://sepolia.base.org \
    --broadcast
```

### Confirm Escrow
```bash
ESCROW_CONTRACT_ADDRESS=0x... \
REQUEST_ID=0x... \
BUYER_ADDRESS=0x... \
AMOUNT=1000000 \
API_RESPONSE_HASH=0x... \
OPERATOR_PRIVATE_KEY=0x... \
forge script script/EscrowOperations.s.sol:ConfirmEscrowScript \
    --rpc-url https://sepolia.base.org \
    --broadcast
```

### Query Request Status
```bash
cast call <ESCROW_ADDRESS> \
    "getRequestStatus(bytes32)(uint8)" \
    <REQUEST_ID> \
    --rpc-url https://sepolia.base.org
```

## Request ID Generation

Request IDs are generated as:
```solidity
keccak256(abi.encodePacked(buyer, serviceProvider, nonce))
```

Use the query script option 4 to generate IDs, or:
```bash
cast keccak "$(cast abi-encode 'f(address,address,uint256)' <BUYER> <SERVICE> <NONCE>)"
```