// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DisputeEscrowFactory.sol";

contract DisputeEscrow {

    enum RequestStatus {
          ServiceInitiated,    // 0: Payment pending
          Escrowed,           // 1: Payment received, service can be provided
          EscrowReleased,     // 2: Funds released to seller
          DisputeOpened,      // 3: Buyer filed dispute
          SellerAccepted,     // 4: Seller accepted refund
          DisputeRejected,    // 5: Seller rejected refund
          DisputeEscalated,   // 6: Escalated to agent
          DisputeResolved     // 7: Agent resolved
    }

    struct ServiceRequest {
          address buyer;
          // address seller; seller is known as this contract is specific to the seller
          uint256 amount;
          uint256 escrowedAt;      // Timestamp when escrowed
          uint256 nextDeadline;     // Next action deadline (changes meaning based on status)
          RequestStatus status;
          bytes32 apiResponseHash;  // Set by operator
          address disputeAgent;      // Assigned if escalated
          bool buyerRefunded;
          bool sellerRejected;      // Whether seller rejected the refund request
    }

    // Immutable state
    address public immutable serviceProvider;
    bytes public servicePublicKey;
    string public serviceMetadataURI;
    address public immutable factory;
    address public immutable usdc;

    // Request tracking
    mapping(bytes32 => ServiceRequest) public requests;

    // Balance tracking
    uint256 public allocatedBalance;  // Sum of all active request amounts

    uint256 public escrowPeriod = 30 minutes;
    uint256 public disputePeriod = 10 minutes;
    uint256 public constant BUYER_ESCALATION_PERIOD = 2 days;

    // Events
    event EscrowConfirmed(bytes32 indexed requestId, bytes32 apiResponseHash);
    event EscrowReleased(bytes32 indexed requestId, uint256 amount);
    event DisputeOpened(bytes32 indexed requestId, address indexed buyer);
    event DisputeResponded(bytes32 indexed requestId, bool accepted);
    event DisputeEscalated(bytes32 indexed requestId);
    event DisputeResolved(bytes32 indexed requestId, bool buyerRefunded, address indexed disputeAgent);
    event DisputeCancelled(bytes32 indexed requestId);

    // Modifiers
    modifier onlyOperator() {
        require(DisputeEscrowFactory(factory).isOperator(msg.sender), "Not operator");
        _;
    }

    modifier onlyDisputeAgent() {
        require(DisputeEscrowFactory(factory).isDisputeAgent(msg.sender), "Not dispute agent");
        _;
    }

    modifier onlyServiceProvider() {
        require(msg.sender == serviceProvider, "Not service provider");
        _;
    }

    constructor(
        address _serviceProvider,
        bytes memory _publicKey,
        string memory _metadataURI,
        address _usdc
    ) {
        serviceProvider = _serviceProvider;
        servicePublicKey = _publicKey;
        serviceMetadataURI = _metadataURI;
        factory = msg.sender;
        usdc = _usdc;
    }

    /**
     * @dev Operator creates and confirms a service request with escrow
     * @param requestId Unique identifier for the request
     * @param buyer Address of the buyer
     * @param amount Amount of USDC to escrow for this request
     * @param apiResponseHash Hash of the API response
     */
     // @TODO: verify input params based on nonce
    function confirmEscrow(
        bytes32 requestId,
        address buyer,
        uint256 amount,
        bytes32 apiResponseHash
    ) external onlyOperator {
        // Check request doesn't already exist
        require(requests[requestId].buyer == address(0), "Request already exists");
        require(buyer != address(0), "Invalid buyer");
        require(amount > 0, "Invalid amount");

        // Check sufficient unallocated balance
        uint256 contractBalance = IERC20(usdc).balanceOf(address(this));
        uint256 unallocatedBalance = contractBalance - allocatedBalance;
        require(unallocatedBalance >= amount, "Insufficient unallocated funds");

        // Increase allocated balance
        allocatedBalance += amount;

        // Create the service request
        requests[requestId] = ServiceRequest({
            buyer: buyer,
            amount: amount,
            escrowedAt: block.timestamp,
            nextDeadline: block.timestamp + escrowPeriod,  // Deadline for buyer to dispute
            status: RequestStatus.Escrowed,
            apiResponseHash: apiResponseHash,
            disputeAgent: address(0),
            buyerRefunded: false,
            sellerRejected: false
        });

        emit EscrowConfirmed(requestId, apiResponseHash);
    }

    /**
     * @dev Release funds to service provider after escrow period
     * @param requestId Unique identifier for the request
     */
    function releaseEscrow(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];

        // Can release if:
        // 1. Status is Escrowed and dispute deadline passed
        // 2. Status is DisputeRejected and escalation deadline passed
        // 3. Status is DisputeOpened (seller didn't respond) and reasonable time passed for buyer to escalate
        if (req.status == RequestStatus.Escrowed) {
            require(block.timestamp >= req.nextDeadline, "Still in dispute window");
        } else if (req.status == RequestStatus.DisputeRejected) {
            // Seller rejected, check escalation deadline
            require(block.timestamp >= req.nextDeadline, "Still in escalation window");
        } else if (req.status == RequestStatus.DisputeOpened) {
            // Seller didn't respond, give buyer reasonable time to escalate
            require(block.timestamp >= req.nextDeadline + BUYER_ESCALATION_PERIOD, "Buyer can still escalate");
        } else {
            revert("Cannot release funds");
        }

        allocatedBalance -= req.amount;
        req.status = RequestStatus.EscrowReleased;

        // Transfer funds to service provider
        IERC20(usdc).transfer(serviceProvider, req.amount);

        emit EscrowReleased(requestId, req.amount);
    }

    /**
     * @dev Buyer can release funds early if satisfied with service
     * @param requestId Unique identifier for the request
     */
    function earlyRelease(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.buyer, "Not buyer");
        require(req.status == RequestStatus.Escrowed, "Not in escrow");

        req.status = RequestStatus.EscrowReleased;
        allocatedBalance -= req.amount;

        // Transfer funds to service provider
        IERC20(usdc).transfer(serviceProvider, req.amount);

        emit EscrowReleased(requestId, req.amount);
    }

    /**
     * @dev Buyer opens a dispute within the dispute window
     * @param requestId Unique identifier for the request
     */
    function openDispute(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.buyer, "Not buyer");
        require(req.status == RequestStatus.Escrowed, "Not in escrow");
        require(block.timestamp < req.nextDeadline, "Dispute window closed");

        req.status = RequestStatus.DisputeOpened;
        req.nextDeadline = block.timestamp + disputePeriod;  // Now deadline for seller to respond

        emit DisputeOpened(requestId, req.buyer);
    }

    /**
     * @dev Service provider responds to dispute
     * @param requestId Unique identifier for the request
     * @param acceptRefund Whether to accept the refund request
     */
    function respondToDispute(bytes32 requestId, bool acceptRefund) external onlyServiceProvider {
        ServiceRequest storage req = requests[requestId];
        require(req.status == RequestStatus.DisputeOpened, "No dispute opened");
        require(block.timestamp <= req.nextDeadline, "Response period expired");
        require(!req.sellerRejected, "Already responded");

        if (acceptRefund) {
            req.status = RequestStatus.SellerAccepted;
            req.buyerRefunded = true;

            // Decrease allocated balance as funds are being refunded
            allocatedBalance -= req.amount;

            // Transfer refund to buyer
            IERC20(usdc).transfer(req.buyer, req.amount);
        } else {
            // Seller rejected - buyer has 2 days to escalate
            req.status = RequestStatus.DisputeRejected;
            req.sellerRejected = true;
            req.nextDeadline = block.timestamp + BUYER_ESCALATION_PERIOD;  // Now deadline for buyer to escalate
        }

        emit DisputeResponded(requestId, acceptRefund);
    }

    /**
     * @dev Buyer escalates dispute after seller rejection or timeout
     * @param requestId Unique identifier for the request
     */
    function escalateDispute(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.buyer, "Not buyer");
        require(
            req.status == RequestStatus.DisputeOpened ||
            req.status == RequestStatus.DisputeRejected,
            "Invalid dispute status"
        );

        // Can escalate if:
        // 1. DisputeOpened and seller didn't respond in time
        // 2. DisputeRejected and buyer is within escalation deadline
        if (req.status == RequestStatus.DisputeOpened) {
            // Seller didn't respond - check if response deadline passed
            require(block.timestamp > req.nextDeadline, "Seller response period still active");
        } else if (req.status == RequestStatus.DisputeRejected) {
            // Seller rejected - check if buyer is within escalation deadline
            require(block.timestamp <= req.nextDeadline, "Escalation period expired");
        }

        req.status = RequestStatus.DisputeEscalated;
        // No new deadline needed - agent resolves at their discretion

        emit DisputeEscalated(requestId);
    }

    /**
     * @dev Dispute agent resolves the escalated dispute
     * @param requestId Unique identifier for the request
     * @param refundBuyer Whether to refund the buyer
     */
    function resolveDispute(bytes32 requestId, bool refundBuyer) external onlyDisputeAgent {
        ServiceRequest storage req = requests[requestId];
        require(req.status == RequestStatus.DisputeEscalated, "Not escalated");

        req.status = RequestStatus.DisputeResolved;
        req.disputeAgent = msg.sender;

        // Decrease allocated balance as funds are being distributed
        allocatedBalance -= req.amount;

        if (refundBuyer) {
            req.buyerRefunded = true;
            IERC20(usdc).transfer(req.buyer, req.amount);
        } else {
            // Funds go to service provider
            IERC20(usdc).transfer(serviceProvider, req.amount);
        }

        emit DisputeResolved(requestId, refundBuyer, msg.sender);
    }

    /**
     * @dev Cancel an open dispute (only buyer can cancel)
     * @param requestId Unique identifier for the request
     */
    function cancelDispute(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.buyer, "Not buyer");
        require(
            req.status == RequestStatus.DisputeOpened ||
            req.status == RequestStatus.DisputeRejected ||
            req.status == RequestStatus.DisputeEscalated,
            "Invalid dispute status"
        );

        // Reset to escrowed with expired deadline so seller can immediately withdraw
        req.status = RequestStatus.Escrowed;
        req.nextDeadline = block.timestamp; // Expired, so funds can be released immediately
        req.sellerRejected = false; // Reset rejection flag

        // Note: allocatedBalance stays the same as funds are still allocated,
        // just now available for the seller to withdraw

        emit DisputeCancelled(requestId);
    }

    // ============ View Functions ============

    /**
     * @dev Get unallocated balance (funds available for new requests)
     * @return Available balance not allocated to any request
     */
    function getUnallocatedBalance() external view returns (uint256) {
        uint256 contractBalance = IERC20(usdc).balanceOf(address(this));
        return contractBalance - allocatedBalance;
    }

    /**
     * @dev Get the status of a request
     * @param requestId Unique identifier for the request
     * @return Current status of the request
     */
    function getRequestStatus(bytes32 requestId) external view returns (RequestStatus) {
        return requests[requestId].status;
    }

    /**
     * @dev Check if seller can still respond to dispute
     * @param requestId Unique identifier for the request
     * @return Whether seller can respond
     */
    function canSellerRespond(bytes32 requestId) external view returns (bool) {
        ServiceRequest memory req = requests[requestId];
        return req.status == RequestStatus.DisputeOpened &&
               !req.sellerRejected &&
               block.timestamp <= req.nextDeadline;
    }

    /**
     * @dev Get the next deadline for a request
     * @param requestId Unique identifier for the request
     * @return Next deadline timestamp
     */
    function getNextDeadline(bytes32 requestId) external view returns (uint256) {
        return requests[requestId].nextDeadline;
    }

    /**
     * @dev Check if the deadline has passed for a request
     * @param requestId Unique identifier for the request
     * @return Whether the deadline has passed
     */
    function isDeadlinePassed(bytes32 requestId) external view returns (bool) {
        return block.timestamp >= requests[requestId].nextDeadline;
    }
}