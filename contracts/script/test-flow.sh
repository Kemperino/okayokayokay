#!/bin/bash

# Complete test flow for dispute escrow system

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=== Dispute Escrow Test Flow ===${NC}"
echo ""
echo "This script demonstrates a complete flow:"
echo "1. Register a service"
echo "2. Fund the escrow"
echo "3. Confirm a request"
echo "4. Open and handle a dispute"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    exit 1
fi

source .env

if [ -z "$FACTORY_ADDRESS" ] || [ -z "$USDC_ADDRESS" ]; then
    echo -e "${RED}Error: FACTORY_ADDRESS and USDC_ADDRESS must be set in .env${NC}"
    exit 1
fi

RPC_URL="https://sepolia.base.org"

echo -e "${GREEN}Step 1: Generate test wallets${NC}"
echo ""

# Generate test wallets using cast
SELLER_WALLET=$(cast wallet new)
SELLER_KEY=$(echo "$SELLER_WALLET" | grep "Private key:" | awk '{print $3}')
SELLER_ADDR=$(echo "$SELLER_WALLET" | grep "Address:" | awk '{print $2}')

BUYER_WALLET=$(cast wallet new)
BUYER_KEY=$(echo "$BUYER_WALLET" | grep "Private key:" | awk '{print $3}')
BUYER_ADDR=$(echo "$BUYER_WALLET" | grep "Address:" | awk '{print $2}')

OPERATOR_WALLET=$(cast wallet new)
OPERATOR_KEY=$(echo "$OPERATOR_WALLET" | grep "Private key:" | awk '{print $3}')
OPERATOR_ADDR=$(echo "$OPERATOR_WALLET" | grep "Address:" | awk '{print $2}')

echo "Seller Address: $SELLER_ADDR"
echo "Buyer Address: $BUYER_ADDR"
echo "Operator Address: $OPERATOR_ADDR"
echo ""

echo -e "${GREEN}Step 2: Fund test wallets with ETH${NC}"
echo "(You need to manually send ETH to these addresses for gas)"
echo ""
read -p "Press Enter after funding wallets with ETH..."

echo ""
echo -e "${GREEN}Step 3: Fund buyer with USDC${NC}"
echo ""
echo "Note: You need to manually send USDC to the buyer address:"
echo "Buyer: $BUYER_ADDR"
echo ""
echo "For Base Sepolia, get test USDC from a faucet or transfer from another wallet."
read -p "Press Enter after funding buyer with USDC..."

echo ""
echo -e "${GREEN}Step 4: Set operator role${NC}"
echo ""

NEW_OPERATOR_ADDRESS=$OPERATOR_ADDR \
ADMIN_PRIVATE_KEY=$PRIVATE_KEY \
forge script script/ManageRoles.s.sol:SetOperatorScript \
    --rpc-url $RPC_URL \
    --broadcast

echo ""
echo -e "${GREEN}Step 5: Register service${NC}"
echo ""

# Generate a simple public key for testing
SERVICE_PUBLIC_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
SERVICE_METADATA_URI="ipfs://QmTest123"

SERVICE_PUBLIC_KEY=$SERVICE_PUBLIC_KEY \
SERVICE_METADATA_URI=$SERVICE_METADATA_URI \
PRIVATE_KEY=$SELLER_KEY \
forge script script/RegisterService.s.sol:RegisterServiceScript \
    --rpc-url $RPC_URL \
    --broadcast

# Get the escrow contract address
ESCROW_ADDR=$(cast call $FACTORY_ADDRESS "getServiceEscrow(address)(address)" $SELLER_ADDR --rpc-url $RPC_URL)
echo "Escrow Contract: $ESCROW_ADDR"

echo ""
echo -e "${GREEN}Step 6: Transfer USDC to escrow (simulating facilitator)${NC}"
echo ""

# Transfer 1000 USDC to escrow
TRANSFER_AMOUNT=1000000000  # 1000 USDC

# Using cast to transfer USDC
cast send $USDC_ADDRESS \
    "transfer(address,uint256)(bool)" \
    $ESCROW_ADDR \
    $TRANSFER_AMOUNT \
    --private-key $BUYER_KEY \
    --rpc-url $RPC_URL

echo ""
echo -e "${GREEN}Step 7: Confirm escrow${NC}"
echo ""

# Generate request ID
REQUEST_ID=$(cast keccak "$(cast abi-encode 'f(address,address,uint256)' $BUYER_ADDR $SELLER_ADDR 1)")
API_RESPONSE_HASH=$(cast keccak "test_response")
AMOUNT=100000000  # 100 USDC

ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
REQUEST_ID=$REQUEST_ID \
BUYER_ADDRESS=$BUYER_ADDR \
AMOUNT=$AMOUNT \
API_RESPONSE_HASH=$API_RESPONSE_HASH \
OPERATOR_PRIVATE_KEY=$OPERATOR_KEY \
forge script script/EscrowOperations.s.sol:ConfirmEscrowScript \
    --rpc-url $RPC_URL \
    --broadcast

echo ""
echo -e "${YELLOW}Step 8: Open dispute${NC}"
echo ""

ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
REQUEST_ID=$REQUEST_ID \
BUYER_PRIVATE_KEY=$BUYER_KEY \
forge script script/DisputeOperations.s.sol:OpenDisputeScript \
    --rpc-url $RPC_URL \
    --broadcast

echo ""
echo -e "${YELLOW}Step 9: Seller responds to dispute (reject)${NC}"
echo ""

ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
REQUEST_ID=$REQUEST_ID \
ACCEPT_REFUND=false \
SELLER_PRIVATE_KEY=$SELLER_KEY \
forge script script/DisputeOperations.s.sol:RespondToDisputeScript \
    --rpc-url $RPC_URL \
    --broadcast

echo ""
echo -e "${GREEN}=== Test Flow Complete ===${NC}"
echo ""
echo "Summary:"
echo "- Factory: $FACTORY_ADDRESS"
echo "- USDC: $USDC_ADDRESS"
echo "- Service Provider: $SELLER_ADDR"
echo "- Escrow Contract: $ESCROW_ADDR"
echo "- Buyer: $BUYER_ADDR"
echo "- Request ID: $REQUEST_ID"
echo ""
echo "Next steps you can try:"
echo "1. Escalate the dispute (buyer)"
echo "2. Resolve the dispute (dispute agent)"
echo "3. Cancel the dispute (buyer)"
echo "4. Query the request status"
echo ""

# Save test data for later use
cat > test-data.env << EOF
# Test Flow Data
TEST_SELLER_ADDR=$SELLER_ADDR
TEST_SELLER_KEY=$SELLER_KEY
TEST_BUYER_ADDR=$BUYER_ADDR
TEST_BUYER_KEY=$BUYER_KEY
TEST_OPERATOR_ADDR=$OPERATOR_ADDR
TEST_OPERATOR_KEY=$OPERATOR_KEY
TEST_ESCROW_ADDR=$ESCROW_ADDR
TEST_REQUEST_ID=$REQUEST_ID
EOF

echo "Test data saved to test-data.env"