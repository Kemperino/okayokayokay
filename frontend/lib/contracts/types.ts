import type { Address, Hex } from 'viem';
import { RequestStatus } from './DisputeEscrowABI';

/**
 * Service request data structure as returned from the contract
 */
export interface ServiceRequest {
  buyer: Address;
  amount: bigint;
  escrowedAt: bigint;
  nextDeadline: bigint;
  status: RequestStatus;
  apiResponseHash: Hex;
  disputeAgent: Address;
  buyerRefunded: boolean;
  sellerRejected: boolean;
}

/**
 * Extended service request with computed metadata
 */
export interface ServiceRequestWithMetadata extends ServiceRequest {
  requestId: Hex;
  escrowAddress: Address;
  canOpenDispute: boolean;
  canEscalateDispute: boolean;
  canSellerRespond: boolean;
  canReleaseEscrow: boolean;
  deadlineExpired: boolean;
  timeUntilDeadline: bigint;
}

/**
 * Result of a write transaction
 */
export interface TransactionResult {
  success: boolean;
  transactionHash?: Hex;
  error?: string;
}

/**
 * Parameters for opening a dispute
 */
export interface OpenDisputeParams {
  requestId: Hex;
  escrowAddress: Address;
}

/**
 * Parameters for escalating a dispute
 */
export interface EscalateDisputeParams {
  requestId: Hex;
  escrowAddress: Address;
}

/**
 * Parameters for merchant responding to dispute
 */
export interface RespondToDisputeParams {
  requestId: Hex;
  escrowAddress: Address;
  acceptRefund: boolean;
}

/**
 * Parameters for releasing escrow
 */
export interface ReleaseEscrowParams {
  requestId: Hex;
  escrowAddress: Address;
}

/**
 * Parameters for early release (buyer satisfaction)
 */
export interface EarlyReleaseParams {
  requestId: Hex;
  escrowAddress: Address;
}

/**
 * Parameters for canceling a dispute
 */
export interface CancelDisputeParams {
  requestId: Hex;
  escrowAddress: Address;
}

/**
 * Helper to check if buyer can open a dispute
 */
export function canOpenDispute(request: ServiceRequest, currentTime: bigint = BigInt(Math.floor(Date.now() / 1000))): boolean {
  return request.status === RequestStatus.Escrowed && currentTime < request.nextDeadline;
}

/**
 * Helper to check if buyer can escalate a dispute
 */
export function canEscalateDispute(request: ServiceRequest, currentTime: bigint = BigInt(Math.floor(Date.now() / 1000))): boolean {
  if (request.status !== RequestStatus.DisputeOpened) return false;

  // Can escalate if seller didn't respond and deadline passed
  if (!request.sellerRejected && currentTime > request.nextDeadline) return true;

  // Can escalate if seller rejected and still within escalation window
  if (request.sellerRejected && currentTime <= request.nextDeadline) return true;

  return false;
}

/**
 * Helper to check if merchant can respond to dispute
 */
export function canMerchantRespond(request: ServiceRequest, currentTime: bigint = BigInt(Math.floor(Date.now() / 1000))): boolean {
  return (
    request.status === RequestStatus.DisputeOpened &&
    !request.sellerRejected &&
    currentTime <= request.nextDeadline
  );
}

/**
 * Helper to check if escrow can be released
 */
export function canReleaseEscrow(request: ServiceRequest, currentTime: bigint = BigInt(Math.floor(Date.now() / 1000))): boolean {
  if (request.status === RequestStatus.Escrowed && currentTime >= request.nextDeadline) {
    return true;
  }

  if (request.status === RequestStatus.DisputeOpened) {
    if (request.sellerRejected && currentTime >= request.nextDeadline) {
      return true;
    }
    // BUYER_ESCALATION_PERIOD = 2 days = 172800 seconds
    const BUYER_ESCALATION_PERIOD = BigInt(172800);
    if (!request.sellerRejected && currentTime >= request.nextDeadline + BUYER_ESCALATION_PERIOD) {
      return true;
    }
  }

  return false;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(request: ServiceRequest, currentTime: bigint = BigInt(Math.floor(Date.now() / 1000))): string {
  switch (request.status) {
    case RequestStatus.ServiceInitiated:
      return 'Payment pending';
    case RequestStatus.Escrowed:
      if (currentTime < request.nextDeadline) {
        return 'In escrow (dispute window open)';
      }
      return 'In escrow (ready to release)';
    case RequestStatus.EscrowReleased:
      return 'Funds released to merchant';
    case RequestStatus.DisputeOpened:
      if (request.sellerRejected) {
        if (currentTime <= request.nextDeadline) {
          return 'Dispute rejected by merchant (buyer can escalate)';
        }
        return 'Dispute rejected (escalation period expired)';
      }
      if (currentTime <= request.nextDeadline) {
        return 'Dispute opened (awaiting merchant response)';
      }
      return 'Dispute opened (merchant response period expired)';
    case RequestStatus.SellerAccepted:
      return 'Dispute resolved (buyer refunded)';
    case RequestStatus.DisputeEscalated:
      return 'Dispute escalated to agent';
    case RequestStatus.DisputeResolved:
      return request.buyerRefunded ? 'Agent resolved (buyer refunded)' : 'Agent resolved (merchant favored)';
    default:
      return 'Unknown status';
  }
}

/**
 * Get time until deadline in seconds
 */
export function getTimeUntilDeadline(request: ServiceRequest, currentTime: bigint = BigInt(Math.floor(Date.now() / 1000))): bigint {
  if (currentTime >= request.nextDeadline) {
    return BigInt(0);
  }
  return request.nextDeadline - currentTime;
}

/**
 * Convert request ID string to Hex format
 */
export function toRequestIdHex(requestId: string): Hex {
  if (requestId.startsWith('0x')) {
    return requestId as Hex;
  }
  return `0x${requestId}` as Hex;
}
