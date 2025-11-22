// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DisputeEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConfirmEscrowScript is Script {
    function run() external {
        uint256 operatorKey = vm.envUint("OPERATOR_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");

        // Request parameters
        bytes32 requestId = vm.envBytes32("REQUEST_ID");
        address buyer = vm.envAddress("BUYER_ADDRESS");
        uint256 amount = vm.envUint("AMOUNT");
        bytes32 apiResponseHash = vm.envBytes32("API_RESPONSE_HASH");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(operatorKey);
        escrow.confirmEscrow(requestId, buyer, amount, apiResponseHash);
        vm.stopBroadcast();

        console.log("===== Escrow Confirmed =====");
        console.log("Request ID:", vm.toString(requestId));
        console.log("Buyer:", buyer);
        console.log("Amount:", amount);
        console.log("============================");
    }
}

contract ReleaseEscrowScript is Script {
    function run() external {
        uint256 callerKey = vm.envUint("PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        bytes32 requestId = vm.envBytes32("REQUEST_ID");

        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        vm.startBroadcast(callerKey);
        escrow.releaseEscrow(requestId);
        vm.stopBroadcast();

        console.log("Escrow released for request:", vm.toString(requestId));
    }
}

contract FundEscrowScript is Script {
    function run() external {
        uint256 facilitatorKey = vm.envUint("FACILITATOR_PRIVATE_KEY");
        address escrowAddress = vm.envAddress("ESCROW_CONTRACT_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        uint256 amount = vm.envUint("FUND_AMOUNT");

        IERC20 usdc = IERC20(usdcAddress);

        vm.startBroadcast(facilitatorKey);

        // Transfer USDC to escrow contract
        usdc.transfer(escrowAddress, amount);

        vm.stopBroadcast();

        console.log("===== Escrow Funded =====");
        console.log("Escrow Contract:", escrowAddress);
        console.log("Amount:", amount);
        console.log("New Balance:", usdc.balanceOf(escrowAddress));
        console.log("=========================");
    }
}