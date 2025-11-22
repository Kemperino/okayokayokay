#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}=== Base Sepolia Deployment Script ===${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo ""
    echo "Please create a .env file with your deployment credentials."
    echo "You can copy .env.example as a template:"
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Source the .env file
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env!${NC}"
    echo ""
    echo "Generate a new wallet using:"
    echo "  ./script/generate-wallet.sh"
    echo ""
    exit 1
fi

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo -e "Deployer Address: ${GREEN}$DEPLOYER_ADDRESS${NC}"

# Check balance
echo ""
echo "Checking balance on Base Sepolia..."
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url https://sepolia.base.org)
BALANCE_ETH=$(cast to-unit $BALANCE ether)
echo -e "Balance: ${GREEN}$BALANCE_ETH ETH${NC}"

# Check if balance is sufficient (at least 0.01 ETH for deployment)
MIN_BALANCE="10000000000000000" # 0.01 ETH in wei
if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    echo ""
    echo -e "${YELLOW}Warning: Low balance!${NC}"
    echo "You need at least 0.01 ETH for deployment."
    echo ""
    echo "Get Base Sepolia ETH from:"
    echo "  https://www.alchemy.com/faucets/base-sepolia"
    echo "  https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Build successful!${NC}"
echo ""
echo "Deploying to Base Sepolia..."
echo ""

# Run the deployment script
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    --verify \
    -vvv

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== Deployment Successful! ===${NC}"
    echo ""
    echo "Check the output above for contract addresses."
    echo "Add them to your .env file for future use."
    echo ""
    echo "View on BaseScan:"
    echo "  https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>"
else
    echo ""
    echo -e "${RED}Deployment failed!${NC}"
    echo "Check the error messages above."
    exit 1
fi