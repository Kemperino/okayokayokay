# Dispute Escrow Scripts

This directory contains all scripts for deploying and interacting with the Dispute Escrow smart contracts.

## Setup Scripts

### `generate-wallet.sh`
Generates a new wallet for deployment or testing.
```bash
./script/generate-wallet.sh
```

### `deploy.sh`
Deploys the factory contract to Base Sepolia (requires existing USDC address).
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

```bash
./script/backend-operations.sh
```

### Individual Foundry Scripts

#### Service Management
- `RegisterService.s.sol` - Register a new service provider
- `ManageRoles.s.sol` - Set operator, dispute agent roles

#### Escrow Operations
- `EscrowOperations.s.sol` - Fund, confirm, release escrow

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
# Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
# Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
FACTORY_ADDRESS=0x...  # Set after deployment
```

Optional:
```
ADMIN_ADDRESS=0x...
OPERATOR_ADDRESS=0x...
DISPUTE_AGENT_ADDRESS=0x...
```

## Common Operations

### Network Selection
By default, scripts use Base Mainnet. To use Base Sepolia testnet:
```bash
# For deployment
./script/deploy.sh sepolia

# For operations scripts
NETWORK=sepolia ./script/backend-operations.sh
NETWORK=sepolia ./script/query-contracts.sh
```

### Register a Dispute Agent
```bash
NEW_DISPUTE_AGENT_ADDRESS=0x... \
ADMIN_PRIVATE_KEY=0x... \
FACTORY_ADDRESS=0x... \
forge script script/ManageRoles.s.sol:SetDisputeAgentScript \
    --rpc-url https://mainnet.base.org \
    --broadcast
```

### Set Operator
```bash
NEW_OPERATOR_ADDRESS=0x... \
ADMIN_PRIVATE_KEY=0x... \
FACTORY_ADDRESS=0x... \
forge script script/ManageRoles.s.sol:SetOperatorScript \
    --rpc-url https://mainnet.base.org \
    --broadcast
```

### Register a New Service
```bash
SERVICE_PUBLIC_KEY=0x... \
SERVICE_METADATA_URI="ipfs://..." \
forge script script/RegisterService.s.sol:RegisterServiceScript \
    --rpc-url https://mainnet.base.org \
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
    --rpc-url https://mainnet.base.org \
    --broadcast
```

### Query Request Status
```bash
cast call <ESCROW_ADDRESS> \
    "getRequestStatus(bytes32)(uint8)" \
    <REQUEST_ID> \
    --rpc-url https://mainnet.base.org
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