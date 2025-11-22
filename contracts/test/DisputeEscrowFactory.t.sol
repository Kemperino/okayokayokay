// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DisputeEscrowFactory.sol";
import "../src/DisputeEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simple test token for testing
contract TestERC20 is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // Mint 1M USDC (6 decimals)
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract DisputeEscrowFactoryTest is Test {
    DisputeEscrowFactory public factory;
    IERC20 public usdc;

    address admin = address(0x1);
    address operator = address(0x2);
    address operator2 = address(0x3);
    address disputeAgent = address(0x4);
    address disputeAgent2 = address(0x5);
    address serviceProvider1 = address(0x6);
    address serviceProvider2 = address(0x7);
    address nonAdmin = address(0x8);
    address facilitator = address(0x9);

    bytes servicePublicKey1 = "0x1234567890abcdef";
    bytes servicePublicKey2 = "0xfedcba0987654321";
    string metadataURI1 = "ipfs://QmService1";
    string metadataURI2 = "ipfs://QmService2";

    event ServiceRegistered(address indexed service, address escrowContract, bytes publicKey);

    function setUp() public {
        // Deploy a test ERC20 token to simulate USDC
        // Using Foundry's built-in test token
        address usdcAddress = address(new TestERC20());
        usdc = IERC20(usdcAddress);

        // Deploy factory as admin
        vm.prank(admin);
        factory = new DisputeEscrowFactory(usdcAddress, admin);
    }

    // ============ Deployment Tests ============

    function testFactoryDeployment() public view {
        // Check initial state
        assertEq(address(factory.usdc()), address(usdc));
        assertTrue(factory.hasRole(factory.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(factory.hasRole(factory.ADMIN_ROLE(), admin));
    }

    function testRoleConstants() public view {
        // Verify role identifiers are unique
        bytes32 adminRole = factory.ADMIN_ROLE();
        bytes32 operatorRole = factory.OPERATOR_ROLE();
        bytes32 disputeAgentRole = factory.DISPUTE_AGENT_ROLE();

        assertTrue(adminRole != operatorRole);
        assertTrue(adminRole != disputeAgentRole);
        assertTrue(operatorRole != disputeAgentRole);
    }

    // ============ Service Registration Tests ============

    function testRegisterService() public {
        // Service provider registers
        vm.prank(serviceProvider1);

        address escrowAddress = factory.registerService(servicePublicKey1, metadataURI1);

        // Verify registration
        assertEq(factory.serviceToEscrow(serviceProvider1), escrowAddress);
        assertTrue(factory.isValidEscrow(escrowAddress));

        // Verify escrow contract state
        DisputeEscrow escrow = DisputeEscrow(escrowAddress);
        assertEq(escrow.serviceProvider(), serviceProvider1);
        assertEq(escrow.servicePublicKey(), servicePublicKey1);
        assertEq(escrow.serviceMetadataURI(), metadataURI1);
        assertEq(address(escrow.factory()), address(factory));
        assertEq(address(escrow.usdc()), address(usdc));
    }

    function testRegisterMultipleServices() public {
        // First service
        vm.prank(serviceProvider1);
        address escrow1 = factory.registerService(servicePublicKey1, metadataURI1);

        // Second service
        vm.prank(serviceProvider2);
        address escrow2 = factory.registerService(servicePublicKey2, metadataURI2);

        // Verify both registered
        assertEq(factory.serviceToEscrow(serviceProvider1), escrow1);
        assertEq(factory.serviceToEscrow(serviceProvider2), escrow2);
        assertTrue(escrow1 != escrow2);
    }

    function testCannotRegisterServiceTwice() public {
        // First registration
        vm.prank(serviceProvider1);
        factory.registerService(servicePublicKey1, metadataURI1);

        // Try to register again
        vm.prank(serviceProvider1);
        vm.expectRevert("Service already registered");
        factory.registerService(servicePublicKey2, metadataURI2);
    }

    function testGetServiceEscrow() public {
        // Register service
        vm.prank(serviceProvider1);
        address escrowAddress = factory.registerService(servicePublicKey1, metadataURI1);

        // Test getter
        assertEq(factory.getServiceEscrow(serviceProvider1), escrowAddress);

        // Non-registered service returns zero address
        assertEq(factory.getServiceEscrow(serviceProvider2), address(0));
    }

    // ============ Role Management Tests ============

    function testSetOperator() public {
        // Admin sets operator
        vm.prank(admin);
        factory.setOperator(operator);

        assertTrue(factory.isOperator(operator));
        assertTrue(factory.hasRole(factory.OPERATOR_ROLE(), operator));
    }

    function testSetMultipleOperators() public {
        // Admin can set multiple operators
        vm.startPrank(admin);
        factory.setOperator(operator);
        factory.setOperator(operator2);
        vm.stopPrank();

        assertTrue(factory.isOperator(operator));
        assertTrue(factory.isOperator(operator2));
    }

    function testSetDisputeAgent() public {
        // Admin sets dispute agent
        vm.prank(admin);
        factory.setDisputeAgent(disputeAgent);

        assertTrue(factory.isDisputeAgent(disputeAgent));
        assertTrue(factory.hasRole(factory.DISPUTE_AGENT_ROLE(), disputeAgent));
    }

    function testSetMultipleDisputeAgents() public {
        // Admin can set multiple dispute agents
        vm.startPrank(admin);
        factory.setDisputeAgent(disputeAgent);
        factory.setDisputeAgent(disputeAgent2);
        vm.stopPrank();

        assertTrue(factory.isDisputeAgent(disputeAgent));
        assertTrue(factory.isDisputeAgent(disputeAgent2));
    }

    function testRevokeOperator() public {
        // Set and then revoke
        vm.startPrank(admin);
        factory.setOperator(operator);
        assertTrue(factory.isOperator(operator));

        factory.revokeOperator(operator);
        assertFalse(factory.isOperator(operator));
        vm.stopPrank();
    }

    function testRevokeDisputeAgent() public {
        // Set and then revoke
        vm.startPrank(admin);
        factory.setDisputeAgent(disputeAgent);
        assertTrue(factory.isDisputeAgent(disputeAgent));

        factory.revokeDisputeAgent(disputeAgent);
        assertFalse(factory.isDisputeAgent(disputeAgent));
        vm.stopPrank();
    }

    // ============ Access Control Tests ============

    function testOnlyAdminCanSetOperator() public {
        // Non-admin tries to set operator
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.setOperator(operator);

        // Service provider tries
        vm.prank(serviceProvider1);
        vm.expectRevert();
        factory.setOperator(operator);
    }

    function testOnlyAdminCanSetDisputeAgent() public {
        // Non-admin tries to set dispute agent
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.setDisputeAgent(disputeAgent);

        // Operator tries (even if they have operator role)
        vm.prank(admin);
        factory.setOperator(operator);

        vm.prank(operator);
        vm.expectRevert();
        factory.setDisputeAgent(disputeAgent);
    }

    function testOnlyAdminCanRevokeRoles() public {
        // Setup roles
        vm.startPrank(admin);
        factory.setOperator(operator);
        factory.setDisputeAgent(disputeAgent);
        vm.stopPrank();

        // Non-admin tries to revoke operator
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.revokeOperator(operator);

        // Non-admin tries to revoke dispute agent
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.revokeDisputeAgent(disputeAgent);
    }

    // ============ View Function Tests ============

    function testIsOperatorFunction() public {
        // Initially false
        assertFalse(factory.isOperator(operator));

        // Set operator
        vm.prank(admin);
        factory.setOperator(operator);

        // Now true
        assertTrue(factory.isOperator(operator));

        // Others still false
        assertFalse(factory.isOperator(operator2));
        assertFalse(factory.isOperator(nonAdmin));
    }

    function testIsDisputeAgentFunction() public {
        // Initially false
        assertFalse(factory.isDisputeAgent(disputeAgent));

        // Set dispute agent
        vm.prank(admin);
        factory.setDisputeAgent(disputeAgent);

        // Now true
        assertTrue(factory.isDisputeAgent(disputeAgent));

        // Others still false
        assertFalse(factory.isDisputeAgent(disputeAgent2));
        assertFalse(factory.isDisputeAgent(nonAdmin));
    }

    function testIsValidEscrowFunction() public {
        // Deploy escrow through factory
        vm.prank(serviceProvider1);
        address escrowAddress = factory.registerService(servicePublicKey1, metadataURI1);

        // Should be valid
        assertTrue(factory.isValidEscrow(escrowAddress));

        // Random address should not be valid
        assertFalse(factory.isValidEscrow(address(0x123)));
        assertFalse(factory.isValidEscrow(address(0)));
    }

    // ============ Integration Tests ============

    function testEscrowContractUsesFactoryRoles() public {
        // Setup roles in factory
        vm.startPrank(admin);
        factory.setOperator(operator);
        factory.setDisputeAgent(disputeAgent);
        vm.stopPrank();

        // Register service
        vm.prank(serviceProvider1);
        address escrowAddress = factory.registerService(servicePublicKey1, metadataURI1);
        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        // Fund the escrow
        TestERC20(address(usdc)).mint(facilitator, 1000 * 10**6);
        vm.prank(facilitator);
        usdc.transfer(escrowAddress, 100 * 10**6);

        // Operator should be able to confirm escrow
        vm.prank(operator);
        escrow.confirmEscrow(
            keccak256("request1"),
            address(0x100), // buyer
            100 * 10**6,
            keccak256("response")
        );

        // Non-operator should fail
        vm.prank(nonAdmin);
        vm.expectRevert("Not operator");
        escrow.confirmEscrow(
            keccak256("request2"),
            address(0x101),
            100 * 10**6,
            keccak256("response2")
        );
    }

    function testMultipleEscrowsShareFactoryRoles() public {
        // Setup roles
        vm.startPrank(admin);
        factory.setOperator(operator);
        factory.setDisputeAgent(disputeAgent);
        vm.stopPrank();

        // Register two services
        vm.prank(serviceProvider1);
        address escrow1 = factory.registerService(servicePublicKey1, metadataURI1);

        vm.prank(serviceProvider2);
        address escrow2 = factory.registerService(servicePublicKey2, metadataURI2);

        // Fund both escrows
        TestERC20(address(usdc)).mint(facilitator, 1000 * 10**6);
        vm.startPrank(facilitator);
        usdc.transfer(escrow1, 100 * 10**6);
        usdc.transfer(escrow2, 100 * 10**6);
        vm.stopPrank();

        // Same operator can operate on both
        vm.startPrank(operator);
        DisputeEscrow(escrow1).confirmEscrow(
            keccak256("request1"),
            address(0x100),
            50 * 10**6,
            keccak256("response1")
        );

        DisputeEscrow(escrow2).confirmEscrow(
            keccak256("request2"),
            address(0x101),
            50 * 10**6,
            keccak256("response2")
        );
        vm.stopPrank();
    }

    function testRevokedOperatorCannotAccessEscrow() public {
        // Setup
        vm.prank(admin);
        factory.setOperator(operator);

        vm.prank(serviceProvider1);
        address escrowAddress = factory.registerService(servicePublicKey1, metadataURI1);
        DisputeEscrow escrow = DisputeEscrow(escrowAddress);

        // Fund escrow
        TestERC20(address(usdc)).mint(facilitator, 1000 * 10**6);
        vm.prank(facilitator);
        usdc.transfer(escrowAddress, 100 * 10**6);

        // Operator can confirm
        vm.prank(operator);
        escrow.confirmEscrow(
            keccak256("request1"),
            address(0x100),
            50 * 10**6,
            keccak256("response1")
        );

        // Revoke operator role
        vm.prank(admin);
        factory.revokeOperator(operator);

        // Operator can no longer confirm
        vm.prank(operator);
        vm.expectRevert("Not operator");
        escrow.confirmEscrow(
            keccak256("request2"),
            address(0x101),
            50 * 10**6,
            keccak256("response2")
        );
    }

    // ============ Edge Cases ============

    function testEmptyPublicKey() public {
        // Try to register with empty public key
        vm.prank(serviceProvider1);
        bytes memory emptyKey = "";
        address escrow = factory.registerService(emptyKey, metadataURI1);

        // Should still work - contract doesn't validate key content
        assertTrue(factory.isValidEscrow(escrow));
    }

    function testEmptyMetadataURI() public {
        // Try to register with empty metadata
        vm.prank(serviceProvider1);
        string memory emptyURI = "";
        address escrow = factory.registerService(servicePublicKey1, emptyURI);

        // Should still work - contract doesn't validate URI content
        assertTrue(factory.isValidEscrow(escrow));
    }

    function testSamePublicKeyDifferentServices() public {
        // Two services can use the same public key
        vm.prank(serviceProvider1);
        address escrow1 = factory.registerService(servicePublicKey1, metadataURI1);

        vm.prank(serviceProvider2);
        address escrow2 = factory.registerService(servicePublicKey1, metadataURI2);

        // Both should be registered
        assertTrue(factory.isValidEscrow(escrow1));
        assertTrue(factory.isValidEscrow(escrow2));
        assertTrue(escrow1 != escrow2);
    }

    function testGrantAdditionalAdminRole() public {
        // Verify admin has DEFAULT_ADMIN_ROLE (needed to grant roles)
        assertTrue(factory.hasRole(factory.DEFAULT_ADMIN_ROLE(), admin));

        // Store the role constant to avoid consuming the prank
        bytes32 adminRole = factory.ADMIN_ROLE();

        // Admin can grant ADMIN_ROLE to another address
        vm.prank(admin);
        factory.grantRole(adminRole, nonAdmin);

        // Verify nonAdmin now has ADMIN_ROLE
        assertTrue(factory.hasRole(factory.ADMIN_ROLE(), nonAdmin));

        // New admin can set roles
        vm.prank(nonAdmin);
        factory.setOperator(operator);
        assertTrue(factory.isOperator(operator));

        // Original admin can still operate
        vm.prank(admin);
        factory.setDisputeAgent(disputeAgent);
        assertTrue(factory.isDisputeAgent(disputeAgent));

        // But nonAdmin doesn't have DEFAULT_ADMIN_ROLE so can't grant roles
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.grantRole(adminRole, operator);
    }

    function testAdminHasBothRoles() public view {
        // Verify admin has both DEFAULT_ADMIN_ROLE and ADMIN_ROLE after deployment
        assertTrue(factory.hasRole(factory.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(factory.hasRole(factory.ADMIN_ROLE(), admin));

        // Both roles are different
        assertTrue(factory.DEFAULT_ADMIN_ROLE() != factory.ADMIN_ROLE());
    }
}