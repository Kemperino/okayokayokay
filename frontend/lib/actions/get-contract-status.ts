"use server";

import {
  getRequestStatus,
  getRequestDetails,
  RequestStatusLabels,
  RequestStatus,
} from "@/lib/contracts";
import type { Hex, Address } from "viem";
import { getRequestNextDeadline } from "../contracts/status-queries";

export interface ContractStatusResult {
  status: RequestStatus | null;
  statusLabel: string;
  hasStatus: boolean;
  buyerRefunded?: boolean;
  amount?: string;
}

type RequestDetailsResult = Awaited<ReturnType<typeof getRequestDetails>>;

interface CacheEntry {
  promise: Promise<RequestDetailsResult>;
  timestamp: number;
}

const requestDetailsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5000; // 5 seconds cache TTL

function getRequestCacheKey(requestId: Hex, escrowAddress: Address): string {
  return `${escrowAddress.toLowerCase()}:${requestId.toLowerCase()}`;
}

async function getCachedRequestDetails(
  requestId: Hex,
  escrowAddress: Address
): Promise<RequestDetailsResult> {
  const key = getRequestCacheKey(requestId, escrowAddress);
  const now = Date.now();
  const cached = requestDetailsCache.get(key);

  // Use cache only if it's less than 5 seconds old
  if (cached && now - cached.timestamp < CACHE_TTL) {
    try {
      return await cached.promise;
    } catch (error) {
      requestDetailsCache.delete(key);
      throw error;
    }
  }

  // Fetch fresh data
  const promise = getRequestDetails(requestId, escrowAddress);
  requestDetailsCache.set(key, { promise, timestamp: now });

  try {
    return await promise;
  } catch (error) {
    requestDetailsCache.delete(key);
    throw error;
  }
}

/**
 * Clear the cache for a specific request (useful after transactions)
 */
export async function clearRequestCache(
  requestId: string,
  escrowAddress: string
) {
  const key = `${escrowAddress.toLowerCase()}:${requestId.toLowerCase()}`;
  requestDetailsCache.delete(key);
  console.log("[clearRequestCache] Cleared cache for:", key);
}

/**
 * Get the contract status for a request
 * Returns fallback message if escrow address is not set or status cannot be fetched
 */
export async function getContractStatus(
  requestId: string,
  escrowContractAddress: string | null
): Promise<ContractStatusResult> {
  // If no escrow contract address, return fallback
  if (!escrowContractAddress) {
    return {
      status: null,
      statusLabel: "No escrow",
      hasStatus: false,
    };
  }

  try {
    // Ensure request ID is in hex format
    const requestIdHex = requestId.startsWith("0x")
      ? (requestId as Hex)
      : (`0x${requestId}` as Hex);

    console.log("[getContractStatus] Querying contract:", {
      requestId: requestIdHex,
      escrowAddress: escrowContractAddress,
    });

    // Fetch full request details to get buyerRefunded field
    const request = await getCachedRequestDetails(
      requestIdHex,
      escrowContractAddress as Address
    );

    console.log("[getContractStatus] Contract returned request:", request);

    if (!request) {
      return {
        status: null,
        statusLabel: "Not found",
        hasStatus: false,
      };
    }

    return {
      status: request.status,
      statusLabel: RequestStatusLabels[request.status],
      hasStatus: true,
      buyerRefunded: request.buyerRefunded,
      amount: request.amount?.toString(),
    };
  } catch (error) {
    console.error("[getContractStatus] Error fetching contract status:", error);
    return {
      status: null,
      statusLabel: "Error fetching",
      hasStatus: false,
    };
  }
}

/**
 * Check if a buyer can open a dispute for a given request.
 * Calls the on-chain `requests` mapping and checks that the status is Escrowed
 * and the dispute window (nextDeadline) has not yet passed.
 */
export async function canOpenDispute(
  requestId: string,
  escrowContractAddress: string | null
): Promise<boolean> {
  if (!escrowContractAddress) {
    return false;
  }

  try {
    const requestIdHex = requestId.startsWith("0x")
      ? (requestId as Hex)
      : (`0x${requestId}` as Hex);

    console.log("[canOpenDispute] Fetching request from contract:", {
      requestId: requestIdHex,
      escrowAddress: escrowContractAddress,
    });

    const request = await getCachedRequestDetails(
      requestIdHex,
      escrowContractAddress as Address
    );

    if (!request) {
      return false;
    }

    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    return (
      request.status === RequestStatus.Escrowed &&
      currentTime < request.nextDeadline
    );
  } catch (error) {
    console.error(
      "[canOpenDispute] Error checking if dispute can be opened:",
      error
    );
    return false;
  }
}

/**
 * Check if a buyer can escalate an existing dispute.
 * Returns true when the request is in DisputeOpened status AND either:
 * 1. Seller didn't respond and deadline passed, OR
 * 2. Seller rejected and buyer is within escalation deadline
 */
export async function canEscalateDispute(
  requestId: string,
  escrowContractAddress: string | null
): Promise<boolean> {
  if (!escrowContractAddress) {
    return false;
  }

  try {
    const requestIdHex = requestId.startsWith("0x")
      ? (requestId as Hex)
      : (`0x${requestId}` as Hex);

    console.log("[canEscalateDispute] Fetching request from contract:", {
      requestId: requestIdHex,
      escrowAddress: escrowContractAddress,
    });

    const request = await getCachedRequestDetails(
      requestIdHex,
      escrowContractAddress as Address
    );

    if (!request) {
      return false;
    }

    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    // Can escalate from DisputeOpened if seller didn't respond and deadline passed
    if (request.status === RequestStatus.DisputeOpened && !request.sellerRejected && currentTime > request.nextDeadline) {
      return true;
    }

    // Can escalate from DisputeRejected if still within escalation window
    if (request.status === RequestStatus.DisputeRejected && currentTime <= request.nextDeadline) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      "[canEscalateDispute] Error checking if dispute can be escalated:",
      error
    );
    return false;
  }
}

/**
 * Check if a buyer can cancel an existing dispute.
 * 
 * Can cancel when:
 * - DisputeOpened: Buyer opened dispute, seller hasn't responded yet
 * - DisputeRejected: Seller rejected the refund request
 * - DisputeEscalated: Dispute was escalated to agent but not yet resolved
 * 
 * Cannot cancel when:
 * - SellerAccepted: Seller already accepted refund, automatic processing
 * - DisputeResolved: Agent already resolved the dispute
 * - Any other status: No active dispute to cancel
 */
export async function canCancelDispute(
  requestId: string,
  escrowContractAddress: string | null
): Promise<boolean> {
  if (!escrowContractAddress) {
    return false;
  }

  try {
    const requestIdHex = requestId.startsWith("0x")
      ? (requestId as Hex)
      : (`0x${requestId}` as Hex);

    console.log("[canCancelDispute] Fetching request from contract:", {
      requestId: requestIdHex,
      escrowAddress: escrowContractAddress,
    });

    const request = await getCachedRequestDetails(
      requestIdHex,
      escrowContractAddress as Address
    );

    if (!request) {
      return false;
    }

    if (request.status === RequestStatus.SellerAccepted) {
      console.log("[canCancelDispute] Cannot cancel: seller already accepted refund");
      return false;
    }

    if (request.status === RequestStatus.DisputeResolved) {
      console.log("[canCancelDispute] Cannot cancel: dispute already resolved");
      return false;
    }

    return (
      request.status === RequestStatus.DisputeOpened ||
      request.status === RequestStatus.DisputeRejected ||
      request.status === RequestStatus.DisputeEscalated
    );
  } catch (error) {
    console.error(
      "[canCancelDispute] Error checking if dispute can be cancelled:",
      error
    );
    return false;
  }
}

/**
 * Batch fetch contract statuses for multiple requests
 */
export async function batchGetContractStatuses(
  requests: Array<{ requestId: string; escrowContractAddress: string | null }>
): Promise<Map<string, ContractStatusResult>> {
  const results = new Map<string, ContractStatusResult>();

  await Promise.all(
    requests.map(async ({ requestId, escrowContractAddress }) => {
      const result = await getContractStatus(requestId, escrowContractAddress);
      results.set(requestId, result);
    })
  );

  return results;
}

/**
 * Get the contract status for a request
 * Returns fallback message if escrow address is not set or status cannot be fetched
 */
export async function getContractNextDeadline(
  requestId: string,
  escrowContractAddress: string | null
): Promise<number | null> {
  // If no escrow contract address, return fallback
  if (!escrowContractAddress) {
    return null;
  }

  try {
    // Ensure request ID is in hex format
    const requestIdHex = requestId.startsWith("0x")
      ? (requestId as Hex)
      : (`0x${requestId}` as Hex);

    console.log("[getContractStatus] Querying contract:", {
      requestId: requestIdHex,
      escrowAddress: escrowContractAddress,
    });

    // Fetch status from blockchain
    const nextDeadlineData = await getRequestNextDeadline(
      requestIdHex,
      escrowContractAddress as Address
    );

    console.log(
      "[getContractStatus] Contract returned status:",
      nextDeadlineData
    );

    const [
      buyer,
      amount,
      escrowedAt,
      nextDeadline,
      status,
      apiResponseHash,
      disputeAgent,
      buyerRefunded,
      sellerRejected,
    ] = nextDeadlineData;

    return nextDeadline;
  } catch (error) {
    console.error("[getContractStatus] Error fetching contract status:", error);
    return null;
  }
}
