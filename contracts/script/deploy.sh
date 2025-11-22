#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NETWORK="${1:-sepolia}"

case "$NETWORK" in
    sepolia|base-sepolia)
        NETWORK_NAME="Base Sepolia"
        RPC_URL="https://sepolia.base.org"
        EXPLORER_URL_BASE="https://sepolia.basescan.org"
        MIN_BALANCE_WEI="10000000000000000" # 0.01 ETH
        ;;
    mainnet|base|base-mainnet)
        NETWORK_NAME="Base Mainnet"
        RPC_URL="https://mainnet.base.org"
        EXPLORER_URL_BASE="https://basescan.org"
        MIN_BALANCE_WEI="10000000000000000" # adjust if you want a higher safety threshold
        ;;
    *)
        echo -e "${RED}Unknown network: $NETWORK${NC}"
        echo "Usage: $0 [sepolia|base-sepolia|mainnet|base|base-mainnet]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== $NETWORK_NAME Deployment Script ===${NC}"
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

# Check if USDC_ADDRESS is set
if [ -z "$USDC_ADDRESS" ]; then
    echo -e "${RED}Error: USDC_ADDRESS not set in .env!${NC}"
    echo ""
    echo "Set the USDC address in your .env file."
    echo "For Base Mainnet, use: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    echo "For Base Sepolia, use: 0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    echo ""
    exit 1
fi

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY")
echo -e "Deployer Address: ${GREEN}$DEPLOYER_ADDRESS${NC}"

# Check balance
echo ""
echo "Checking balance on $NETWORK_NAME..."
BALANCE=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC_URL")
BALANCE_ETH=$(cast to-unit "$BALANCE" ether)
echo -e "Balance: ${GREEN}$BALANCE_ETH ETH${NC}"

if [ "$BALANCE" -lt "$MIN_BALANCE_WEI" ]; then
    echo ""
    echo -e "${YELLOW}Warning: Low balance for $NETWORK_NAME!${NC}"
    echo "You need at least $(cast to-unit "$MIN_BALANCE_WEI" ether) ETH for deployment."
    echo ""
    if [[ "$NETWORK_NAME" == "Base Sepolia" ]]; then
        echo "Get Base Sepolia ETH from:"
        echo "  https://www.alchemy.com/faucets/base-sepolia"
        echo "  https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
        echo ""
    fi
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
echo "Deploying to $NETWORK_NAME..."
echo ""

# Run the deployment script
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url "$RPC_URL" \
    --broadcast \
    --verify \
    -vvv

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== Deployment Successful on $NETWORK_NAME! ===${NC}"
    echo ""
    echo "Check the output above for contract addresses."
    echo "Add them to your .env file for future use."
    echo ""
    echo "View on BaseScan:"
    echo "  $EXPLORER_URL_BASE/address/<CONTRACT_ADDRESS>"
else
    echo ""
    echo -e "${RED}Deployment failed on $NETWORK_NAME!${NC}"
    echo "Check the error messages above."
    exit 1
fi
