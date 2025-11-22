// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./DisputeEscrow.sol";

contract DisputeEscrowFactory is AccessControl {
      // Role definitions
      bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
      bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
      bytes32 public constant DISPUTE_AGENT_ROLE = keccak256("DISPUTE_AGENT_ROLE");

      address public usdc;

      mapping(address => address) public serviceToEscrow;  // service address -> escrow contract
      mapping(address => bool) public isValidEscrow;       // escrow address -> is valid

      event ServiceRegistered(address indexed service, address escrowContract, bytes publicKey);
      event RoleGrantedToEscrow(address indexed escrowContract, bytes32 indexed role, address indexed account);

      constructor(address _usdc, address _admin) {
          usdc = _usdc;

          // Grant admin role to deployer
          _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
          _grantRole(ADMIN_ROLE, _admin);
      }

      function registerService(
          bytes calldata publicKey,
          string calldata metadataURI
      ) external returns (address escrowContract) {
          address sender = msg.sender;
          // Deploy new DisputeEscrow for this service
          escrowContract = address(new DisputeEscrow(
              sender,
              publicKey,
              metadataURI,
              usdc
          ));

          serviceToEscrow[sender] = escrowContract;
          isValidEscrow[escrowContract] = true;

          emit ServiceRegistered(sender, escrowContract, publicKey);
      }

      // Admin functions
      function setOperator(address operator) external onlyRole(ADMIN_ROLE) {
          grantRole(OPERATOR_ROLE, operator);
      }

      function setFacilitator(address facilitator) external onlyRole(ADMIN_ROLE) {
          grantRole(FACILITATOR_ROLE, facilitator);
      }

      function setDisputeAgent(address disputeAgent) external onlyRole(ADMIN_ROLE) {
          grantRole(DISPUTE_AGENT_ROLE, disputeAgent);
      }

      function revokeOperator(address operator) external onlyRole(ADMIN_ROLE) {
          revokeRole(OPERATOR_ROLE, operator);
      }

      function revokeFacilitator(address facilitator) external onlyRole(ADMIN_ROLE) {
          revokeRole(FACILITATOR_ROLE, facilitator);
      }

      function revokeDisputeAgent(address disputeAgent) external onlyRole(ADMIN_ROLE) {
          revokeRole(DISPUTE_AGENT_ROLE, disputeAgent);
      }

      // View functions
      function getServiceEscrow(address service) external view returns (address) {
          return serviceToEscrow[service];
      }

      function isOperator(address account) external view returns (bool) {
          return hasRole(OPERATOR_ROLE, account);
      }

      function isFacilitator(address account) external view returns (bool) {
          return hasRole(FACILITATOR_ROLE, account);
      }

      function isDisputeAgent(address account) external view returns (bool) {
          return hasRole(DISPUTE_AGENT_ROLE, account);
      }

}