
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
          DisputeEscalated,   // 5: Escalated to agent
          DisputeResolved     // 6: Agent resolved
    }

    struct ServiceRequest {
          address buyer;
          // address seller; seller is known as this contract is specific to the seller
          uint256 amount;
          uint256 escrowedAt;      // Timestamp when escrowed
          uint256 disputeDeadline;  // Timestamp for dispute filing
          uint256 disputeOpenedAt;  // Timestamp when dispute opened
          uint256 sellerResponseDeadline; // Deadline for seller to respond to dispute
          RequestStatus status;
          bytes32 apiResponseHash;  // Set by operator
          address disputeAgent;      // Assigned if escalated
          bool buyerRefunded;
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

    // Events
    event EscrowConfirmed(bytes32 indexed requestId, bytes32 apiResponseHash);
    event EscrowReleased(bytes32 indexed requestId, uint256 amount);
    event DisputeOpened(bytes32 indexed requestId, address indexed buyer);

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
            disputeDeadline: block.timestamp + escrowPeriod,
            disputeOpenedAt: 0,
            sellerResponseDeadline: 0,
            status: RequestStatus.Escrowed,
            apiResponseHash: apiResponseHash,
            disputeAgent: address(0),
            buyerRefunded: false
        });

        emit EscrowConfirmed(requestId, apiResponseHash);
    }

    /**
     * @dev Release funds to service provider after escrow period
     * @param requestId Unique identifier for the request
     */
    function releaseEscrow(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(req.status == RequestStatus.Escrowed, "Not in escrow");
        require(block.timestamp >= req.disputeDeadline, "Still in dispute window");

        allocatedBalance -= req.amount;
        req.status = RequestStatus.EscrowReleased;

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
        require(block.timestamp < req.disputeDeadline, "Dispute window closed");

        req.status = RequestStatus.DisputeOpened;
        req.disputeOpenedAt = block.timestamp;
        req.sellerResponseDeadline = block.timestamp + disputePeriod;

        emit DisputeOpened(requestId, req.buyer);
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
               block.timestamp <= req.sellerResponseDeadline;
    }
}