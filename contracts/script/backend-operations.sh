#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Base RPC URL
RPC_URL="https://sepolia.base.org"

# Function to display menu
show_menu() {
    echo ""
    echo -e "${BLUE}=== Dispute Escrow Backend Operations ===${NC}"
    echo ""
    echo "1. Register Service"
    echo "2. Set Operator"
    echo "3. Set Dispute Agent"
    echo "4. Fund Escrow Contract"
    echo "5. Confirm Escrow"
    echo "6. Release Escrow"
    echo "7. Open Dispute"
    echo "8. Respond to Dispute"
    echo "9. Escalate Dispute"
    echo "10. Resolve Dispute"
    echo "11. Cancel Dispute"
    echo "12. Mint Test USDC"
    echo "13. Check Contract Balances"
    echo "14. Get Request Status"
    echo "0. Exit"
    echo ""
}

# Function to check if required env vars are set
check_env() {
    local vars=("$@")
    for var in "${vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}Error: $var not set in .env${NC}"
            return 1
        fi
    done
    return 0
}

# 1. Register Service
register_service() {
    echo -e "${GREEN}Registering Service...${NC}"

    read -p "Service Public Key (hex): " PUBLIC_KEY
    read -p "Metadata URI: " METADATA_URI

    SERVICE_PUBLIC_KEY=$PUBLIC_KEY \
    SERVICE_METADATA_URI=$METADATA_URI \
    forge script script/RegisterService.s.sol:RegisterServiceScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 2. Set Operator
set_operator() {
    echo -e "${GREEN}Setting Operator...${NC}"

    check_env "FACTORY_ADDRESS" || return

    read -p "New Operator Address: " OPERATOR_ADDR
    read -p "Admin Private Key: " ADMIN_KEY

    NEW_OPERATOR_ADDRESS=$OPERATOR_ADDR \
    ADMIN_PRIVATE_KEY=$ADMIN_KEY \
    forge script script/ManageRoles.s.sol:SetOperatorScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 3. Set Dispute Agent
set_dispute_agent() {
    echo -e "${GREEN}Setting Dispute Agent...${NC}"

    check_env "FACTORY_ADDRESS" || return

    read -p "New Dispute Agent Address: " AGENT_ADDR
    read -p "Admin Private Key: " ADMIN_KEY

    NEW_DISPUTE_AGENT_ADDRESS=$AGENT_ADDR \
    ADMIN_PRIVATE_KEY=$ADMIN_KEY \
    forge script script/ManageRoles.s.sol:SetDisputeAgentScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 4. Fund Escrow
fund_escrow() {
    echo -e "${GREEN}Funding Escrow Contract...${NC}"

    check_env "USDC_ADDRESS" || return

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Amount (in USDC smallest unit, 6 decimals): " AMOUNT
    read -p "Facilitator Private Key: " FACILITATOR_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    FUND_AMOUNT=$AMOUNT \
    FACILITATOR_PRIVATE_KEY=$FACILITATOR_KEY \
    forge script script/EscrowOperations.s.sol:FundEscrowScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 5. Confirm Escrow
confirm_escrow() {
    echo -e "${GREEN}Confirming Escrow...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Buyer Address: " BUYER_ADDR
    read -p "Amount: " AMOUNT
    read -p "API Response Hash (bytes32): " API_HASH
    read -p "Operator Private Key: " OPERATOR_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    BUYER_ADDRESS=$BUYER_ADDR \
    AMOUNT=$AMOUNT \
    API_RESPONSE_HASH=$API_HASH \
    OPERATOR_PRIVATE_KEY=$OPERATOR_KEY \
    forge script script/EscrowOperations.s.sol:ConfirmEscrowScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 6. Release Escrow
release_escrow() {
    echo -e "${GREEN}Releasing Escrow...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Caller Private Key: " CALLER_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    PRIVATE_KEY=$CALLER_KEY \
    forge script script/EscrowOperations.s.sol:ReleaseEscrowScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 7. Open Dispute
open_dispute() {
    echo -e "${YELLOW}Opening Dispute...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Buyer Private Key: " BUYER_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    BUYER_PRIVATE_KEY=$BUYER_KEY \
    forge script script/DisputeOperations.s.sol:OpenDisputeScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 8. Respond to Dispute
respond_dispute() {
    echo -e "${YELLOW}Responding to Dispute...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Accept Refund? (true/false): " ACCEPT
    read -p "Seller Private Key: " SELLER_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    ACCEPT_REFUND=$ACCEPT \
    SELLER_PRIVATE_KEY=$SELLER_KEY \
    forge script script/DisputeOperations.s.sol:RespondToDisputeScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 9. Escalate Dispute
escalate_dispute() {
    echo -e "${YELLOW}Escalating Dispute...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Buyer Private Key: " BUYER_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    BUYER_PRIVATE_KEY=$BUYER_KEY \
    forge script script/DisputeOperations.s.sol:EscalateDisputeScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 10. Resolve Dispute
resolve_dispute() {
    echo -e "${RED}Resolving Dispute (Agent)...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Refund Buyer? (true/false): " REFUND
    read -p "Dispute Agent Private Key: " AGENT_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    REFUND_BUYER=$REFUND \
    DISPUTE_AGENT_PRIVATE_KEY=$AGENT_KEY \
    forge script script/DisputeOperations.s.sol:ResolveDisputeScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 11. Cancel Dispute
cancel_dispute() {
    echo -e "${YELLOW}Cancelling Dispute...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID
    read -p "Buyer Private Key: " BUYER_KEY

    ESCROW_CONTRACT_ADDRESS=$ESCROW_ADDR \
    REQUEST_ID=$REQUEST_ID \
    BUYER_PRIVATE_KEY=$BUYER_KEY \
    forge script script/DisputeOperations.s.sol:CancelDisputeScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 12. Mint Test USDC
mint_usdc() {
    echo -e "${GREEN}Minting Test USDC...${NC}"

    check_env "USDC_ADDRESS" || return

    read -p "Recipient Address (leave empty for self): " RECIPIENT
    read -p "Amount (in USDC smallest unit, 6 decimals): " AMOUNT

    RECIPIENT=$RECIPIENT \
    MINT_AMOUNT=$AMOUNT \
    forge script script/EscrowOperations.s.sol:MintTestUSDCScript \
        --rpc-url $RPC_URL \
        --broadcast \
        -vvv
}

# 13. Check Balances
check_balances() {
    echo -e "${BLUE}Checking Balances...${NC}"

    read -p "Address to check: " ADDRESS

    echo ""
    echo "ETH Balance:"
    cast balance $ADDRESS --rpc-url $RPC_URL

    if [ ! -z "$USDC_ADDRESS" ]; then
        echo ""
        echo "USDC Balance:"
        cast call $USDC_ADDRESS \
            "balanceOf(address)(uint256)" \
            $ADDRESS \
            --rpc-url $RPC_URL
    fi
}

# 14. Get Request Status
get_request_status() {
    echo -e "${BLUE}Getting Request Status...${NC}"

    read -p "Escrow Contract Address: " ESCROW_ADDR
    read -p "Request ID (bytes32): " REQUEST_ID

    echo ""
    echo "Request Status:"
    cast call $ESCROW_ADDR \
        "getRequestStatus(bytes32)(uint8)" \
        $REQUEST_ID \
        --rpc-url $RPC_URL

    echo ""
    echo "Status Codes:"
    echo "0 = ServiceInitiated"
    echo "1 = Escrowed"
    echo "2 = EscrowReleased"
    echo "3 = DisputeOpened"
    echo "4 = SellerAccepted"
    echo "5 = DisputeEscalated"
    echo "6 = DisputeResolved"
}

# Main loop
while true; do
    show_menu
    read -p "Select operation: " choice

    case $choice in
        1) register_service ;;
        2) set_operator ;;
        3) set_dispute_agent ;;
        4) fund_escrow ;;
        5) confirm_escrow ;;
        6) release_escrow ;;
        7) open_dispute ;;
        8) respond_dispute ;;
        9) escalate_dispute ;;
        10) resolve_dispute ;;
        11) cancel_dispute ;;
        12) mint_usdc ;;
        13) check_balances ;;
        14) get_request_status ;;
        0) echo "Exiting..."; exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
done