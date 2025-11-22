#!/bin/bash

echo ""
echo "=== Generating New Deployment Wallet ==="
echo ""

# Generate a new wallet using cast
WALLET_OUTPUT=$(cast wallet new)

# Extract private key and address
PRIVATE_KEY=$(echo "$WALLET_OUTPUT" | grep "Private key:" | awk '{print $3}')
ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | awk '{print $2}')

echo "✅ Wallet generated successfully!"
echo ""
echo "Address: $ADDRESS"
echo "Private Key: $PRIVATE_KEY"
echo ""
echo "=== Add these to your .env file ==="
echo ""
echo "PRIVATE_KEY=$PRIVATE_KEY"
echo "DEPLOYER_ADDRESS=$ADDRESS"
echo ""
echo "=== Fund this address with Base Sepolia ETH ==="
echo ""
echo "1. Get Base Sepolia ETH from: https://www.alchemy.com/faucets/base-sepolia"
echo "2. Send ETH to: $ADDRESS"
echo "3. Verify balance: cast balance $ADDRESS --rpc-url https://sepolia.base.org"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"