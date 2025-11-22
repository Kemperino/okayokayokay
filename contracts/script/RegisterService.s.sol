// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DisputeEscrowFactory.sol";

contract RegisterServiceScript is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");

        // Service metadata
        bytes memory publicKey = vm.envBytes("SERVICE_PUBLIC_KEY");
        string memory metadataURI = vm.envString("SERVICE_METADATA_URI");

        DisputeEscrowFactory factory = DisputeEscrowFactory(factoryAddress);

        vm.startBroadcast(privateKey);

        // Register the service
        address escrowContract = factory.registerService(publicKey, metadataURI);

        vm.stopBroadcast();

        console.log("===== Service Registration Successful =====");
        console.log("Service Provider:", vm.addr(privateKey));
        console.log("Escrow Contract:", escrowContract);
        console.log("Metadata URI:", metadataURI);
        console.log("==========================================");
    }
}