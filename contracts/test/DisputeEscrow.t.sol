// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DisputeEscrow.sol";
import "../src/DisputeEscrowFactory.sol";
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

contract DisputeEscrowTest is Test {
    DisputeEscrowFactory public factory;
    DisputeEscrow public escrow;
    IERC20 public usdc;

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
        // Deploy a test ERC20 token to simulate USDC
        address usdcAddress = address(new TestERC20());
        usdc = IERC20(usdcAddress);

        // Deploy factory
        vm.prank(admin);
        factory = new DisputeEscrowFactory(usdcAddress, admin);

        // Set roles
        vm.startPrank(admin);
        factory.setOperator(operator);
        factory.setDisputeAgent(disputeAgent);
        vm.stopPrank();

        // Register service provider
        vm.prank(serviceProvider);
        address escrowAddress = factory.registerService(servicePublicKey, metadataURI);
        escrow = DisputeEscrow(escrowAddress);

        // Fund facilitator and buyers with USDC
        TestERC20(address(usdc)).mint(facilitator, 10000 * 10**6);
        TestERC20(address(usdc)).mint(buyer1, 1000 * 10**6);
        TestERC20(address(usdc)).mint(buyer2, 1000 * 10**6);
    }

    // ============ Deployment Tests ============

    function testFactoryDeployment() public view {
        assertEq(address(factory.usdc()), address(usdc));
        assertTrue(factory.hasRole(factory.ADMIN_ROLE(), admin));
        assertTrue(factory.isOperator(operator));
        assertTrue(factory.isDisputeAgent(disputeAgent));
    }

    function testEscrowDeployment() public view {
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

        // Check status is now DisputeRejected
        (,,,, DisputeEscrow.RequestStatus status,,, bool buyerRefunded, bool sellerRejected) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeRejected));
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

    function testCancelRejectedDispute() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Seller rejects
        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Check status is DisputeRejected
        assertEq(uint(escrow.getRequestStatus(REQUEST_ID_1)), uint(DisputeEscrow.RequestStatus.DisputeRejected));

        // Buyer can cancel rejected dispute
        vm.prank(buyer1);
        vm.expectEmit(true, false, false, false);
        emit DisputeCancelled(REQUEST_ID_1);
        escrow.cancelDispute(REQUEST_ID_1);

        // Check status back to escrowed
        assertEq(uint(escrow.getRequestStatus(REQUEST_ID_1)), uint(DisputeEscrow.RequestStatus.Escrowed));

        // Seller can now withdraw
        escrow.releaseEscrow(REQUEST_ID_1);
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

    function testGetNextDeadline() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        uint256 currentTime = block.timestamp;
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Get deadline
        uint256 deadline = escrow.getNextDeadline(REQUEST_ID_1);
        assertEq(deadline, currentTime + escrow.escrowPeriod());

        // Open dispute and check deadline changes
        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);

        uint256 newDeadline = escrow.getNextDeadline(REQUEST_ID_1);
        assertEq(newDeadline, block.timestamp + escrow.disputePeriod());
    }

    function testIsDeadlinePassed() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Initially deadline should not have passed
        assertFalse(escrow.isDeadlinePassed(REQUEST_ID_1));

        // Fast forward to just before deadline
        vm.warp(block.timestamp + escrow.escrowPeriod() - 1);
        assertFalse(escrow.isDeadlinePassed(REQUEST_ID_1));

        // Fast forward to exactly the deadline
        vm.warp(block.timestamp + 1);
        assertTrue(escrow.isDeadlinePassed(REQUEST_ID_1));

        // Fast forward past deadline
        vm.warp(block.timestamp + 100);
        assertTrue(escrow.isDeadlinePassed(REQUEST_ID_1));
    }

    function testDeadlineHelperFunctionsWithNoRequest() public view {
        // Test with non-existent request ID
        bytes32 nonExistentId = keccak256("nonexistent");

        // getNextDeadline should return 0 for non-existent request
        uint256 deadline = escrow.getNextDeadline(nonExistentId);
        assertEq(deadline, 0);

        // isDeadlinePassed should return true (since 0 < block.timestamp)
        assertTrue(escrow.isDeadlinePassed(nonExistentId));
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

    // ============ Extended Edge Case Tests ============

    // Test seller can withdraw when dispute times out without seller response and buyer doesn't escalate
    function testSellerWithdrawAfterDisputeTimeoutNoEscalation() public {
        // Setup escrow and open dispute
        _setupDisputedEscrow();

        // Fast forward past seller response deadline AND buyer escalation period
        vm.warp(block.timestamp + escrow.disputePeriod() + 2 days + 1);

        // Now seller should be able to withdraw
        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);
        escrow.releaseEscrow(REQUEST_ID_1);
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
    }

    // Test early release by buyer (before dispute window)
    function testEarlyReleaseByBuyer() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Buyer validates service immediately using earlyRelease
        uint256 sellerBalanceBefore = usdc.balanceOf(serviceProvider);
        vm.prank(buyer1);
        escrow.earlyRelease(REQUEST_ID_1);

        // Verify funds transferred to seller
        assertEq(usdc.balanceOf(serviceProvider), sellerBalanceBefore + ESCROW_AMOUNT);
        assertEq(escrow.allocatedBalance(), 0);
    }

    // Test exact deadline boundary conditions
    function testExactDeadlineBoundaries() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        uint256 confirmTime = block.timestamp;
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Test at exact dispute deadline
        vm.warp(confirmTime + escrow.escrowPeriod());

        // Should be able to release at exact deadline
        escrow.releaseEscrow(REQUEST_ID_1);
    }

    // Test dispute opened at last second
    function testDisputeOpenedAtLastSecond() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        uint256 confirmTime = block.timestamp;
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Fast forward to 1 second before deadline
        vm.warp(confirmTime + escrow.escrowPeriod() - 1);

        // Should still be able to open dispute
        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);

        // Check status
        (,,,, DisputeEscrow.RequestStatus status,,,,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeOpened));
    }

    // Test multiple status transitions on same request
    function testComplexDisputeFlow() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Open dispute
        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);

        // Seller rejects
        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Buyer escalates
        vm.prank(buyer1);
        escrow.escalateDispute(REQUEST_ID_1);

        // Agent resolves in favor of buyer
        vm.prank(disputeAgent);
        escrow.resolveDispute(REQUEST_ID_1, true);

        // Verify final state
        (,,,, DisputeEscrow.RequestStatus status,,, bool buyerRefunded,) = escrow.requests(REQUEST_ID_1);
        assertEq(uint(status), uint(DisputeEscrow.RequestStatus.DisputeResolved));
        assertTrue(buyerRefunded);
    }

    // Test that funds remain locked during dispute
    function testFundsLockedDuringDispute() public {
        // Setup multiple requests
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT * 3);

        // Create first request
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Create second request
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_2, buyer2, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Open dispute on first request
        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);

        // Check balances
        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT * 2);
        assertEq(escrow.getUnallocatedBalance(), ESCROW_AMOUNT);

        // Can still create new request with unallocated funds
        bytes32 requestId3 = keccak256("request3");
        vm.prank(operator);
        escrow.confirmEscrow(requestId3, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        assertEq(escrow.allocatedBalance(), ESCROW_AMOUNT * 3);
        assertEq(escrow.getUnallocatedBalance(), 0);
    }

    // Test view functions consistency
    function testViewFunctionsConsistency() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Check initial status
        assertEq(uint(escrow.getRequestStatus(REQUEST_ID_1)), uint(DisputeEscrow.RequestStatus.Escrowed));

        // Open dispute
        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);

        // Check canSellerRespond
        assertTrue(escrow.canSellerRespond(REQUEST_ID_1));

        // Seller responds with rejection
        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Check canSellerRespond is now false
        assertFalse(escrow.canSellerRespond(REQUEST_ID_1));
    }

    // Test overflow/underflow protection
    function testOverflowProtection() public {
        // Try to allocate more than available
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        // This should not cause underflow
        vm.prank(operator);
        vm.expectRevert("Insufficient unallocated funds");
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT + 1, API_RESPONSE_HASH);
    }

    // Test seller trying to withdraw during active dispute (before seller responds)
    function testSellerCannotWithdrawDuringActiveDispute() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Seller should not be able to withdraw while dispute is active
        // The error message should be "Buyer can still escalate" because seller hasn't responded yet
        vm.expectRevert("Buyer can still escalate");
        escrow.releaseEscrow(REQUEST_ID_1);
    }

    // Test seller trying to withdraw during dispute after rejection but within escalation window
    function testSellerCannotWithdrawDuringEscalationWindow() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Seller rejects
        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_1, false);

        // Still within escalation window - seller cannot withdraw
        vm.expectRevert("Still in escalation window");
        escrow.releaseEscrow(REQUEST_ID_1);
    }

    // Test dispute cancellation at different stages
    function testDisputeCancellationStages() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT * 2);

        // Test 1: Cancel after opening dispute
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_1);

        vm.prank(buyer1);
        escrow.cancelDispute(REQUEST_ID_1);

        // Seller should be able to withdraw immediately
        escrow.releaseEscrow(REQUEST_ID_1);

        // Test 2: Cancel after escalation
        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_2, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        vm.prank(buyer1);
        escrow.openDispute(REQUEST_ID_2);

        vm.prank(serviceProvider);
        escrow.respondToDispute(REQUEST_ID_2, false);

        vm.prank(buyer1);
        escrow.escalateDispute(REQUEST_ID_2);

        vm.prank(buyer1);
        escrow.cancelDispute(REQUEST_ID_2);

        // Seller should be able to withdraw
        escrow.releaseEscrow(REQUEST_ID_2);
    }

    // Test early release cannot be called by non-buyer
    function testEarlyReleaseNotBuyer() public {
        // Setup escrow
        vm.prank(facilitator);
        usdc.transfer(address(escrow), ESCROW_AMOUNT);

        vm.prank(operator);
        escrow.confirmEscrow(REQUEST_ID_1, buyer1, ESCROW_AMOUNT, API_RESPONSE_HASH);

        // Non-buyer tries to early release
        vm.prank(buyer2);
        vm.expectRevert("Not buyer");
        escrow.earlyRelease(REQUEST_ID_1);
    }

    // Test early release after dispute opened
    function testEarlyReleaseAfterDisputeOpened() public {
        // Setup and open dispute
        _setupDisputedEscrow();

        // Try to early release after dispute opened
        vm.prank(buyer1);
        vm.expectRevert("Not in escrow");
        escrow.earlyRelease(REQUEST_ID_1);
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