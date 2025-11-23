/**
 * Main exports for dispute escrow contract interactions
 */

// ABIs
export { DisputeEscrowABI, RequestStatus, RequestStatusLabels } from './DisputeEscrowABI';
export { DisputeEscrowFactoryABI, ADMIN_ROLE, OPERATOR_ROLE, DISPUTE_AGENT_ROLE } from './DisputeEscrowFactoryABI';

// Types
export type {
  ServiceRequest,
  ServiceRequestWithMetadata,
  TransactionResult,
  OpenDisputeParams,
  EscalateDisputeParams,
  RespondToDisputeParams,
  ReleaseEscrowParams,
  EarlyReleaseParams,
  CancelDisputeParams,
} from './types';

export {
  canOpenDispute,
  canEscalateDispute,
  canMerchantRespond,
  canReleaseEscrow,
  getStatusDescription,
  getTimeUntilDeadline,
  toRequestIdHex,
} from './types';

// Buyer actions (CDP wallets)
export {
  openDispute,
  escalateDispute,
  earlyReleaseEscrow,
  cancelDispute,
} from './dispute-actions';

// Merchant actions (wagmi) - TODO: Re-implement when needed
// export {
//   respondToDispute,
//   releaseEscrow,
//   batchReleaseEscrow,
//   canMerchantRespondToDispute,
// } from './merchant-actions';

// Status queries (read-only)
export {
  getEscrowAddressForService,
  getRequestDetails,
  getRequestDetailsWithMetadata,
  getRequestStatus,
  checkSellerCanRespond,
  getServiceProvider,
  getAllocatedBalance,
  getUnallocatedBalance,
  batchGetRequestStatuses,
  batchGetRequestDetails,
} from './status-queries';

// Multicall batching for performance
export { batchGetRequestData } from './multicall-batch';
export type { RequestBatchData } from './multicall-batch';

// Helpers
export { getEscrowAddressForMerchant, toChecksumAddress } from './helpers';

// Legacy exports for backward compatibility
export {
  getRequestFromContract,
  getRequestStatusFromContract,
  batchGetRequestStatuses as batchGetRequestStatusesLegacy,
} from './DisputeEscrowContract';
