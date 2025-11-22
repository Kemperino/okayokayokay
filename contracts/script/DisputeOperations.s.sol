// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DisputeEscrow.sol";

contract OpenDisputeScript is Script {
    function run() external {
        uint256 buyerKey = vm.envUint("BUYER_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        bytes32 requestId = vm.envBytes32("REQUEST_ID");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(buyerKey);
        escrow.openDispute(requestId);
        vm.stopBroadcast();

        console.log("Dispute opened for request:", vm.toString(requestId));
    }
}

contract RespondToDisputeScript is Script {
    function run() external {
        uint256 sellerKey = vm.envUint("SELLER_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        bytes32 requestId = vm.envBytes32("REQUEST_ID");
        bool acceptRefund = vm.envBool("ACCEPT_REFUND");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(sellerKey);
        escrow.respondToDispute(requestId, acceptRefund);
        vm.stopBroadcast();

        console.log("Dispute response submitted:", acceptRefund ? "Accepted" : "Rejected");
    }
}

contract EscalateDisputeScript is Script {
    function run() external {
        uint256 buyerKey = vm.envUint("BUYER_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        bytes32 requestId = vm.envBytes32("REQUEST_ID");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(buyerKey);
        escrow.escalateDispute(requestId);
        vm.stopBroadcast();

        console.log("Dispute escalated for request:", vm.toString(requestId));
    }
}

contract ResolveDisputeScript is Script {
    function run() external {
        uint256 agentKey = vm.envUint("DISPUTE_AGENT_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        bytes32 requestId = vm.envBytes32("REQUEST_ID");
        bool refundBuyer = vm.envBool("REFUND_BUYER");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(agentKey);
        escrow.resolveDispute(requestId, refundBuyer);
        vm.stopBroadcast();

        console.log("===== Dispute Resolved =====");
        console.log("Request ID:", vm.toString(requestId));
        console.log("Decision:", refundBuyer ? "Refund Buyer" : "Pay Seller");
        console.log("============================");
    }
}

contract CancelDisputeScript is Script {
    function run() external {
        uint256 buyerKey = vm.envUint("BUYER_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        bytes32 requestId = vm.envBytes32("REQUEST_ID");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(buyerKey);
        escrow.cancelDispute(requestId);
        vm.stopBroadcast();

        console.log("Dispute cancelled for request:", vm.toString(requestId));
    }
}