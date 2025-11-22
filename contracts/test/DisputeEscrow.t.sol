// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DisputeEscrow.sol";
import "../src/DisputeEscrowFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract DisputeEscrowTest is Test {
    DisputeEscrowFactory public factory;
    DisputeEscrow public escrow;
    MockUSDC public usdc;

    address admin = address(0x1);
    address operator = address(0x2);
    address disputeAgent = address(0x3);
    address serviceProvider = address(0x4);
    address buyer1 = address(0x5);
    address buyer2 = address(0x6);
    address facilitator = address(0x7);

    bytes servicePublicKey = "0x1234567890abcdef";
    string metadataURI = "ipfs://QmServiceMetadata";

    uint256 constant ESCROW_AMOUNT = 100 * 10**6; // 100 USDC
    bytes32 constant REQUEST_ID_1 = keccak256("request1");
    bytes32 constant REQUEST_ID_2 = keccak256("request2");
    bytes32 constant API_RESPONSE_HASH = keccak256("response1");

    event EscrowConfirmed(bytes32 indexed requestId, bytes32 apiResponseHash);
    event EscrowReleased(bytes32 indexed requestId, uint256 amount);
    event DisputeOpened(bytes32 indexed requestId, address indexed buyer);
    event DisputeResponded(bytes32 indexed requestId, bool accepted);
    event DisputeEscalated(bytes32 indexed requestId);
    event DisputeResolved(bytes32 indexed requestId, bool buyerRefunded, address indexed disputeAgent);
    event DisputeCancelled(bytes32 indexed requestId);

    function setUp() public {
        // Deploy USDC mock
        usdc = new MockUSDC();

        // Deploy factory
        vm.prank(admin);
        factory = new DisputeEscrowFactory(address(usdc), admin);

        // Set roles
        vm.startPrank(admin);
        factory.setOperator(operator);
        factory.setDisputeAgent(disputeAgent);
        vm.stopPrank();

        // Register service provider
        vm.prank(serviceProvider);
        address escrowAddress = factory.registerService(servicePublicKey, metadataURI);
        escrow = DisputeEscrow(escrowAddress);

        // Fund facilitator with USDC
        usdc.mint(facilitator, 10000 * 10**6);

        // Fund buyers with some USDC
        usdc.mint(buyer1, 1000 * 10**6);
        usdc.mint(buyer2, 1000 * 10**6);
    }

    // ============ Deployment Tests ============

    function testFactoryDeployment() public {
        assertEq(address(factory.usdc()), address(usdc));
        assertTrue(factory.hasRole(factory.ADMIN_ROLE(), admin));
        assertTrue(factory.isOperator(operator));
        assertTrue(factory.isDisputeAgent(disputeAgent));
    }

    function testEscrowDeployment() public {
        assertEq(escrow.serviceProvider(), serviceProvider);
        assertEq(escrow.serviceMetadataURI(), metadataURI);
        assertEq(address(escrow.factory()), address(factory));
        assertEq(address(escrow.usdc()), address(usdc));
        assertEq(escrow.servicePublicKey(), servicePublicKey);
    }

    // ============ Payment & Escrow Tests ============

    function testTransferFundsToEscrow() public {
        // Facilitator transfers funds to escrow contract
        vm.startPrank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(escrow)), ESCROW_AMOUNT);
        assertEq(escrow.getUnallocatedBalance(), ESCROW_AMOUNT);
    }

    function testConfirmEscrow() public {
        // Setup: Transfer funds
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        // Operator confirms escrow
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit EscrowConfirmed(REQUEST_ID_1, API_RESPONSE_HASH);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Check state
        (address buyer, uint256 amount,, uint256 nextDeadline, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(buyer, buyer1);
        assertEq(amount, ESCROW_AMOUNT);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.Escrowed));
        assertTrue(nextDeadline > block.timestamp);
        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT);
        assertEq(escrow.getUnallocatedBalance(), 0);
    }

    function testConfirmEscrowInsufficientFunds() public {
        // Try to confirm without sufficient funds
        vm.prank(operator);
        vm.expectRevert("Insufficient unallocated funds");
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);
    }

    function testConfirmEscrowNotOperator() public {
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        // Non-operator tries to confirm
        vm.prank(buyer1);
        vm.expectRevert("Not operator");
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);
    }

    function testReleaseEscrowAfterDeadline() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Fast forward past dispute deadline
        vm.warp(block.timestamp + escrow.escrowPeriod() + 1);

        // Anyone can release
        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);

        vm.expectEmit(true, false, false, true);
        emit EscrowReleased(REQUEST_ID_1, ESCROW_AMOUNT);
        escrow.releaseEscrow(REQUEST_ID_1);

        // Check funds transferred
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
        assertEq(escrow.allocatedBalance(), 0);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.EscrowReleased));
    }

    function testReleaseEscrowTooEarly() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Try to release before deadline
        vm.expectRevert("Still in dispute window");
        escrow.releaseEscrow(REQUEST_ID_1);
    }

    // ============ Dispute Tests ============

    function testOpenDispute() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Buyer opens dispute
        vm.prank(buyer1);
        vm.expectEmit(true, true, false, false);
        emit DisputeOpened(REQUEST_ID_1, buyer1);
        escrow.openDispute(REQUEST_ID_1);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeOpened));
    }

    function testOpenDisputeNotBuyer() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Wrong buyer tries to open dispute
        vm.prank(buyer2);
        vm.expectRevert("Not buyer");
        escrow.openDispute(REQUEST_ID_1);
    }

    function testOpenDisputeAfterDeadline() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Fast forward past dispute deadline
        vm.warp(block.timestamp + escrow.escrowPeriod() + 1);

        // Try to open dispute
        vm.prank(buyer1);
        vm.expectRevert("Dispute window closed");
        escrow.openDispute(REQUEST_ID_1);
    }

    function testRespondDisputeAccept() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        uint256 buyerBalanceBefore = usdc.balanceOf(buyer1);

        // Service provider accepts refund
        vm.prank(serviceProvider);
        vm.expectEmit(true, false, false, true);
        emit DisputeResponded(REQUEST_ID_1, true);
        escrow.respondToDispute(REQUEST_ID_1, true);

        // Check buyer got refund
        assertEq(usdc.balanceOf(buyer1), buyerBalanceBefore + ESCROW_AMOUNT);
        assertEq(escrow.allocatedBalance(), 0);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,, bool buyerRefunded,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.SellerAccepted));
        assertTrue(buyerRefunded);
    }

    function testRespondDisputeReject() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Service provider rejects refund
        vm.prank(serviceProvider);
        vm.expectEmit(true, false, false, true);
        emit DisputeResponded(REQUEST_ID_1, false);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Check status remains DisputeOpened for escalation
        (,,,, DisputeEscrow.RequestStatus status,,, bool buyerRefunded, bool sellerRejected) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeOpened));
        assertFalse(buyerRefunded);
        assertTrue(sellerRejected);

        // Check funds still locked
        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT);
    }

    function testRespondDisputeAfterDeadline() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Fast forward past response deadline
        vm.warp(block.timestamp + escrow.disputePeriod() + 1);

        // Try to respond
        vm.prank(serviceProvider);
        vm.expectRevert("Response period expired");
        escrow.respondToDispute(REQUEST_ID_1, true);
    }

    function testEscalateAfterRejection() public {
        // Setup, open dispute, and reject
        _setupDisputedEscrow();

        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Buyer escalates
        vm.prank(buyer1);
        vm.expectEmit(true, false, false, false);
        emit DisputeEscalated(REQUEST_ID_1);
        escrow.escalateDispute(REQUEST_ID_1);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeEscalated));
    }

    function testEscalateAfterTimeout() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Fast forward past response deadline
        vm.warp(block.timestamp + escrow.disputePeriod() + 1);

        // Buyer escalates due to timeout
        vm.prank(buyer1);
        vm.expectEmit(true, false, false, false);
        emit DisputeEscalated(REQUEST_ID_1);
        escrow.escalateDispute(REQUEST_ID_1);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeEscalated));
    }

    function testEscalateRejectionDeadlinePassed() public {
        // Setup, open dispute, and reject
        _setupDisputedEscrow();

        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Fast forward past escalation deadline (2 days)
        vm.warp(block.timestamp + 2 days + 1);

        // Try to escalate
        vm.prank(buyer1);
        vm.expectRevert("Escalation period expired");
        escrow.escalateDispute(REQUEST_ID_1);
    }

    function testResolveDisputeRefundBuyer() public {
        // Setup and escalate
        _setupEscalatedDispute();

        uint256 buyerBalanceBefore = usdc.balanceOf(buyer1);

        // Agent resolves in favor of buyer
        vm.prank(disputeAgent);
        vm.expectEmit(true, false, true, true);
        emit DisputeResolved(REQUEST_ID_1, true, disputeAgent);
        escrow.resolveDispute(REQUEST_ID_1, true);

        // Check buyer got refund
        assertEq(usdc.balanceOf(buyer1), buyerBalanceBefore + ESCROW_AMOUNT);
        assertEq(escrow.allocatedBalance(), 0);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,, bool buyerRefunded,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeResolved));
        assertTrue(buyerRefunded);
    }

    function testResolveDisputeFavorSeller() public {
        // Setup and escalate
        _setupEscalatedDispute();

        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);

        // Agent resolves in favor of seller
        vm.prank(disputeAgent);
        vm.expectEmit(true, false, true, true);
        emit DisputeResolved(REQUEST_ID_1, false, disputeAgent);
        escrow.resolveDispute(REQUEST_ID_1, false);

        // Check seller got funds
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
        assertEq(escrow.allocatedBalance(), 0);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,, bool buyerRefunded,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeResolved));
        assertFalse(buyerRefunded);
    }

    function testResolveDisputeNotAgent() public {
        // Setup and escalate
        _setupEscalatedDispute();

        // Non-agent tries to resolve
        vm.prank(buyer1);
        vm.expectRevert("Not dispute agent");
        escrow.resolveDispute(REQUEST_ID_1, true);
    }

    function testCancelDispute() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Buyer cancels dispute
        vm.prank(buyer1);
        vm.expectEmit(true, false, false, false);
        emit DisputeCancelled(REQUEST_ID_1);
        escrow.cancelDispute(REQUEST_ID_1);

        // Check status back to escrowed with expired deadline
        (,,, uint256 nextDeadline, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.Escrowed));
        assertEq(nextDeadline, block.timestamp);

        // Seller can now withdraw
        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);
        escrow.releaseEscrow(REQUEST_ID_1);
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
    }

    function testCancelDisputeNotBuyer() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Non-buyer tries to cancel
        vm.prank(serviceProvider);
        vm.expectRevert("Not buyer");
        escrow.cancelDispute(REQUEST_ID_1);
    }

    function testCancelEscalatedDispute() public {
        // Setup and escalate
        _setupEscalatedDispute();

        // Buyer cancels escalated dispute
        vm.prank(buyer1);
        vm.expectEmit(true, false, false, false);
        emit DisputeCancelled(REQUEST_ID_1);
        escrow.cancelDispute(REQUEST_ID_1);

        // Seller can now withdraw
        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);
        escrow.releaseEscrow(REQUEST_ID_1);
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
    }

    // ============ Balance Tracking Tests ============

    function testMultipleRequestsBalanceTracking() public {
        // Transfer enough funds for 2 requests
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT * 2);

        // Confirm first request
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);
        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT);
        assertEq(escrow.getUnallocatedBalance(), ESCROW_AMOUNT);

        // Confirm second request
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_2, buyer2, ESCROW_AMOUNT, API_RESPONSE_HASH);
        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT * 2);
        assertEq(escrow.getUnallocatedBalance(), 0);

        // Release first request
        vm.warp(block.timestamp + escrow.escrowPeriod() + 1);
        escrow.releaseEscrow(REQUEST_ID_1);
        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT);
        assertEq(escrow.getUnallocatedBalance(), 0);
    }

    function testPartialFundsAllocation() public {
        // Transfer 150 USDC
        vm.prank(facilitator);
        usdc.transfer(address(escrow), 150 * 10**6);

        // Confirm request for 100 USDC
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Should have 50 USDC unallocated
        assertEq(escrow.getUnallocatedBalance(), 50 * 10**6);

        // Can't confirm another 100 USDC request
        vm.prank(operator);
        vm.expectRevert("Insufficient unallocated funds");
        escrow.confirmEscrow(REQUEST_ID_2, buyer2, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // But can confirm 50 USDC request
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_2, buyer2, 50 * 10**6, API_RESPONSE_HASH);
        assertEq(escrow.getUnallocatedBalance(), 0);
    }

    // ============ View Functions Tests ============

    function testGetRequestStatus() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        assertEq(uint(escrow.getRequestStatus(REQUEST_ID_1)), uint(DisputeEscrow.RequestStatus.Escrowed));
    }

    function testCanSellerRespond() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Should be able to respond
        assertTrue(escrow.canSellerRespond(REQUEST_ID_1));

        // After rejection, can't respond again
        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);
        assertFalse(escrow.canSellerRespond(REQUEST_ID_1));
    }

    // ============ Edge Cases & Security Tests ============

    function testDoubleConfirmSameRequest() public {
        // Transfer funds
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT * 2);

        // First confirm
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Try to confirm same request again
        vm.prank(operator);
        vm.expectRevert("Request already exists");
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);
    }

    function testZeroAmountRequest() public {
        // Transfer funds
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        // Try to confirm with 0 amount
        vm.prank(operator);
        vm.expectRevert("Invalid amount");
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, 0, API_RESPONSE_HASH);
    }

    function testInvalidBuyerAddress() public {
        // Transfer funds
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        // Try to confirm with zero address buyer
        vm.prank(operator);
        vm.expectRevert("Invalid buyer");
        escrow.confirmEscrow(REQUEST_ID_1, address(0), ESCROW_AMOUNT, API_RESPONSE_HASH);
    }

    function testSellerWithdrawAfterRejectionTimeout() public {
        // Setup, open dispute, and reject
        _setupDisputedEscrow();

        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Fast forward past buyer escalation deadline
        vm.warp(block.timestamp + 2 days + 1);

        // Seller should be able to withdraw
        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);
        escrow.releaseEscrow(REQUEST_ID_1);
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
    }

    // ============ Helper Functions ============

    function _setupDisputedEscrow() internal {
        // Transfer funds
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        // Confirm escrow
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Open dispute
        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);
    }

    function _setupEscalatedDispute() internal {
        // Setup disputed escrow
        _setupDisputedEscrow();

        // Seller rejects
        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Buyer escalates
        vm.prank(buyer1);
        escrow.escalateDispute(REQUEST_ID_1);
    }
}