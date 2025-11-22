// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DisputeEscrowFactory.sol";
import "../src/mocks/MockUSDC.sol";

contract DeployScript is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.envOr("ADMIN_ADDRESS", vm.addr(deployerPrivateKey));

        // Try to load USDC address from env, or deploy mock
        address usdc = vm.envOr("USDC_ADDRESS", address(0));

        // If no USDC address provided, deploy a mock
        bool deployedMockUsdc = false;
        if (usdc == address(0)) {
            console.log("No USDC address provided, deploying Mock USDC...");
            deployedMockUsdc = true;
        }

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock USDC if needed
        if (deployedMockUsdc) {
            MockUSDC mockUsdc = new MockUSDC();
            usdc = address(mockUsdc);
            console.log("Mock USDC deployed at:", usdc);
        }

        // Deploy DisputeEscrowFactory
        DisputeEscrowFactory factory = new DisputeEscrowFactory(
            usdc,
            admin
        );

        console.log("===== Deployment Successful =====");
        console.log("DisputeEscrowFactory deployed at:", address(factory));
        console.log("USDC address:", usdc);
        console.log("Admin address:", admin);
        console.log("=================================");

        // Set initial roles if needed
        if (vm.envOr("OPERATOR_ADDRESS", address(0)) != address(0)) {
            address operator = vm.envAddress("OPERATOR_ADDRESS");
            factory.setOperator(operator);
            console.log("Operator set:", operator);
        }

        if (vm.envOr("DISPUTE_AGENT_ADDRESS", address(0)) != address(0)) {
            address disputeAgent = vm.envAddress("DISPUTE_AGENT_ADDRESS");
            factory.setDisputeAgent(disputeAgent);
            console.log("Dispute Agent set:", disputeAgent);
        }

        vm.stopBroadcast();

        // Write deployment info to file for reference
        string memory deploymentInfo = string(
            abi.encodePacked(
                "FACTORY_ADDRESS=", vm.toString(address(factory)), "\n",
                "USDC_ADDRESS=", vm.toString(usdc), "\n",
                "NETWORK=base-sepolia\n",
                "DEPLOYED_AT=", vm.toString(block.timestamp)
            )
        );

        console.log("\n===== Add to .env =====");
        console.log(deploymentInfo);
    }
}