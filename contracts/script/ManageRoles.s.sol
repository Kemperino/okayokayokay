// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DisputeEscrowFactory.sol";

contract SetOperatorScript is Script {
    function run() external {
        uint256 adminKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address operatorAddress = vm.envAddress("NEW_OPERATOR_ADDRESS");

        DisputeEscrowFactory factory = DisputeEscrowFactory(factoryAddress);

        vm.startBroadcast(adminKey);
        factory.setOperator(operatorAddress);
        vm.stopBroadcast();

        console.log("Operator set:", operatorAddress);
    }
}

contract SetDisputeAgentScript is Script {
    function run() external {
        uint256 adminKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address disputeAgent = vm.envAddress("NEW_DISPUTE_AGENT_ADDRESS");

        DisputeEscrowFactory factory = DisputeEscrowFactory(factoryAddress);

        vm.startBroadcast(adminKey);
        factory.setDisputeAgent(disputeAgent);
        vm.stopBroadcast();

        console.log("Dispute Agent set:", disputeAgent);
    }
}

contract RevokeOperatorScript is Script {
    function run() external {
        uint256 adminKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address operatorAddress = vm.envAddress("REVOKE_OPERATOR_ADDRESS");

        DisputeEscrowFactory factory = DisputeEscrowFactory(factoryAddress);

        vm.startBroadcast(adminKey);
        factory.revokeOperator(operatorAddress);
        vm.stopBroadcast();

        console.log("Operator revoked:", operatorAddress);
    }
}