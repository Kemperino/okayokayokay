#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    source .env
fi

RPC_URL="https://sepolia.base.org"

echo ""
echo -e "${BLUE}=== Contract Query Tool ===${NC}"
echo ""

# Function to decode request status
decode_status() {
    case $1 in
        0) echo "ServiceInitiated" ;;
        1) echo "Escrowed" ;;
        2) echo "EscrowReleased" ;;
        3) echo "DisputeOpened" ;;
        4) echo "SellerAccepted" ;;
        5) echo "DisputeEscalated" ;;
        6) echo "DisputeResolved" ;;
        *) echo "Unknown" ;;
    esac
}

# Query Factory Contract
query_factory() {
    if [ -z "$FACTORY_ADDRESS" ]; then
        echo "Factory address not set in .env"
        return
    fi

    echo -e "${GREEN}Factory Contract: $FACTORY_ADDRESS${NC}"
    echo ""

    # Check USDC address
    echo "USDC Address:"
    cast call $FACTORY_ADDRESS "usdc()(address)" --rpc-url $RPC_URL
    echo ""

    # Check if address is operator
    read -p "Check if address is operator: " ADDR
    if [ ! -z "$ADDR" ]; then
        IS_OPERATOR=$(cast call $FACTORY_ADDRESS "isOperator(address)(bool)" $ADDR --rpc-url $RPC_URL)
        echo "Is Operator: $IS_OPERATOR"
    fi
    echo ""

    # Check if address is dispute agent
    read -p "Check if address is dispute agent: " ADDR
    if [ ! -z "$ADDR" ]; then
        IS_AGENT=$(cast call $FACTORY_ADDRESS "isDisputeAgent(address)(bool)" $ADDR --rpc-url $RPC_URL)
        echo "Is Dispute Agent: $IS_AGENT"
    fi
    echo ""

    # Get service escrow contract
    read -p "Get escrow for service address: " SERVICE_ADDR
    if [ ! -z "$SERVICE_ADDR" ]; then
        ESCROW=$(cast call $FACTORY_ADDRESS "getServiceEscrow(address)(address)" $SERVICE_ADDR --rpc-url $RPC_URL)
        echo "Escrow Contract: $ESCROW"
    fi
}

# Query Escrow Contract
query_escrow() {
    read -p "Escrow Contract Address: " ESCROW_ADDR
    if [ -z "$ESCROW_ADDR" ]; then
        return
    fi

    echo ""
    echo -e "${GREEN}Escrow Contract: $ESCROW_ADDR${NC}"
    echo ""

    # Get service provider
    echo "Service Provider:"
    cast call $ESCROW_ADDR "serviceProvider()(address)" --rpc-url $RPC_URL
    echo ""

    # Get contract balance
    echo "USDC Contract Balance:"
    cast call $ESCROW_ADDR "getContractBalance()(uint256)" --rpc-url $RPC_URL
    echo ""

    # Get unallocated balance
    echo "Unallocated Balance:"
    cast call $ESCROW_ADDR "getUnallocatedBalance()(uint256)" --rpc-url $RPC_URL
    echo ""

    # Get allocated balance
    echo "Allocated Balance:"
    cast call $ESCROW_ADDR "allocatedBalance()(uint256)" --rpc-url $RPC_URL
    echo ""

    # Query specific request
    read -p "Query request ID (bytes32, or leave empty): " REQUEST_ID
    if [ ! -z "$REQUEST_ID" ]; then
        echo ""
        echo -e "${YELLOW}Request Details:${NC}"

        # Get request status
        STATUS_NUM=$(cast call $ESCROW_ADDR "getRequestStatus(bytes32)(uint8)" $REQUEST_ID --rpc-url $RPC_URL)
        echo "Status: $(decode_status $STATUS_NUM)"

        # Get full request details
        DETAILS=$(cast call $ESCROW_ADDR "getRequestDetails(bytes32)(address,uint256,uint8,uint256,bytes32,bool)" $REQUEST_ID --rpc-url $RPC_URL)
        echo "Full Details: $DETAILS"

        # Check if can release escrow
        CAN_RELEASE=$(cast call $ESCROW_ADDR "canReleaseEscrow(bytes32)(bool)" $REQUEST_ID --rpc-url $RPC_URL)
        echo "Can Release: $CAN_RELEASE"

        # Check if can open dispute
        CAN_DISPUTE=$(cast call $ESCROW_ADDR "canOpenDispute(bytes32)(bool)" $REQUEST_ID --rpc-url $RPC_URL)
        echo "Can Open Dispute: $CAN_DISPUTE"

        # Check if seller can respond
        CAN_RESPOND=$(cast call $ESCROW_ADDR "canSellerRespond(bytes32)(bool)" $REQUEST_ID --rpc-url $RPC_URL)
        echo "Can Seller Respond: $CAN_RESPOND"

        # Get dispute time remaining
        DISPUTE_TIME=$(cast call $ESCROW_ADDR "getDisputeTimeRemaining(bytes32)(uint256)" $REQUEST_ID --rpc-url $RPC_URL)
        echo "Dispute Time Remaining: $DISPUTE_TIME seconds"
    fi
}

# Main menu
echo "1. Query Factory Contract"
echo "2. Query Escrow Contract"
echo "3. Check Address Roles"
echo "4. Generate Request ID"
echo ""

read -p "Select option: " OPTION

case $OPTION in
    1)
        query_factory
        ;;
    2)
        query_escrow
        ;;
    3)
        if [ -z "$FACTORY_ADDRESS" ]; then
            echo "Factory address not set in .env"
            exit 1
        fi
        read -p "Address to check: " CHECK_ADDR
        echo ""
        echo "Checking roles for: $CHECK_ADDR"
        IS_OP=$(cast call $FACTORY_ADDRESS "isOperator(address)(bool)" $CHECK_ADDR --rpc-url $RPC_URL)
        IS_AGENT=$(cast call $FACTORY_ADDRESS "isDisputeAgent(address)(bool)" $CHECK_ADDR --rpc-url $RPC_URL)
        echo "Is Operator: $IS_OP"
        echo "Is Dispute Agent: $IS_AGENT"
        ;;
    4)
        read -p "Buyer address: " BUYER
        read -p "Service provider address: " SERVICE
        read -p "Nonce (number): " NONCE
        # Generate request ID using cast
        REQUEST_ID=$(cast keccak "$(cast abi-encode 'f(address,address,uint256)' $BUYER $SERVICE $NONCE)")
        echo ""
        echo -e "${GREEN}Generated Request ID:${NC}"
        echo "$REQUEST_ID"
        ;;
    *)
        echo "Invalid option"
        ;;
esac