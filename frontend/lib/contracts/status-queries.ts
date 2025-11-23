/**
 * Read-only query functions for dispute status
 * These functions work with both CDP wallets (buyer) and wagmi (merchant)
 */

import { createPublicClient, http, type Address, type Hex } from "viem";
import { base } from "viem/chains";
import { DisputeEscrowABI, RequestStatus } from "./DisputeEscrowABI";
import { DisputeEscrowFactoryABI } from "./DisputeEscrowFactoryABI";
import type { ServiceRequest, ServiceRequestWithMetadata } from "./types";
import {
  canOpenDispute,
  canEscalateDispute,
  canMerchantRespond,
  canReleaseEscrow,
  getTimeUntilDeadline,
  getStatusDescription,
} from "./types";

// Create a public client for reading from the blockchain
// Use BASE_RPC_URL (server-side) or NEXT_PUBLIC_BASE_RPC_URL (client-side)
const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL ||
      process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      undefined
  ),
});

/**
 * Get the factory contract address from environment
 * Returns null if not configured
 */
function getFactoryAddress(): Address | null {
  const address = process.env.NEXT_PUBLIC_DISPUTE_ESCROW_FACTORY_ADDRESS;
  if (!address) {
    return null;
  }
  return address as Address;
}

/**
 * Get the escrow contract address for a specific service provider
 * @param serviceAddress - Service provider's wallet address
 */
export async function getEscrowAddressForService(
  serviceAddress: Address
): Promise<Address | null> {
  try {
    const factoryAddress = getFactoryAddress();

    // If factory is not configured, return null
    if (!factoryAddress) {
      return null;
    }

    const escrowAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: DisputeEscrowFactoryABI,
      functionName: "getServiceEscrow",
      args: [serviceAddress],
    });

    // Check if it's the zero address
    if (escrowAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    return escrowAddress as Address;
  } catch (error) {
    console.error("Error getting escrow address for service:", error);
    return null;
  }
}

/**
 * Get the full request details from the contract
 * @param requestId - Request ID (32-byte hex)
 * @param escrowAddress - Escrow contract address
 */
export async function getRequestDetails(
  requestId: Hex,
  escrowAddress: Address
): Promise<ServiceRequest | null> {
  try {
    const result = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "requests",
      args: [requestId],
    });

    // If buyer is zero address, request doesn't exist
    if (result[0] === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    return {
      buyer: result[0] as Address,
      amount: result[1] as bigint,
      escrowedAt: result[2] as bigint,
      nextDeadline: result[3] as bigint,
      status: result[4] as RequestStatus,
      apiResponseHash: result[5] as Hex,
      disputeAgent: result[6] as Address,
      buyerRefunded: result[7] as boolean,
      sellerRejected: result[8] as boolean,
    };
  } catch (error) {
    console.error("Error reading request from contract:", error);
    return null;
  }
}

/**
 * Get request details with computed metadata (permissions, deadlines, etc.)
 * @param requestId - Request ID (32-byte hex)
 * @param escrowAddress - Escrow contract address
 */
export async function getRequestDetailsWithMetadata(
  requestId: Hex,
  escrowAddress: Address
): Promise<ServiceRequestWithMetadata | null> {
  const request = await getRequestDetails(requestId, escrowAddress);

  if (!request) {
    return null;
  }

  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const deadlineExpired = currentTime >= request.nextDeadline;

  return {
    ...request,
    requestId,
    escrowAddress,
    canOpenDispute: canOpenDispute(request, currentTime),
    canEscalateDispute: canEscalateDispute(request, currentTime),
    canSellerRespond: canMerchantRespond(request, currentTime),
    canReleaseEscrow: canReleaseEscrow(request, currentTime),
    deadlineExpired,
    timeUntilDeadline: getTimeUntilDeadline(request, currentTime),
  };
}

/**
 * Get just the status of a request
 * @param requestId - Request ID (32-byte hex)
 * @param escrowAddress - Escrow contract address
 */
export async function getRequestStatus(
  requestId: Hex,
  escrowAddress: Address
): Promise<RequestStatus | null> {
  try {
    console.log("[getRequestStatus] Calling contract.getRequestStatus:", {
      address: escrowAddress,
      requestId,
    });

    const status = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "getRequestStatus",
      args: [requestId],
    });

    console.log(
      "[getRequestStatus] Raw status returned:",
      status,
      "Type:",
      typeof status
    );

    return status as RequestStatus;
  } catch (error) {
    console.error(
      "[getRequestStatus] Error reading request status from contract:",
      error
    );
    return null;
  }
}

/**
 * Get just the status of a request
 * @param requestId - Request ID (32-byte hex)
 * @param escrowAddress - Escrow contract address
 */
export async function getRequestNextDeadline(
  requestId: Hex,
  escrowAddress: Address
): Promise<any | null> {
  try {
    console.log("[getRequestStatus] Calling contract.getRequestStatus:", {
      address: escrowAddress,
      requestId,
    });

    const status = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "requests",
      args: [requestId],
    });

    console.log(
      "[getRequestStatus] Raw status returned:",
      status,
      "Type:",
      typeof status
    );

    return status;
  } catch (error) {
    console.error(
      "[getRequestStatus] Error reading request status from contract:",
      error
    );
    return null;
  }
}

/**
 * Check if a seller can respond to a dispute
 * @param requestId - Request ID (32-byte hex)
 * @param escrowAddress - Escrow contract address
 */
export async function checkSellerCanRespond(
  requestId: Hex,
  escrowAddress: Address
): Promise<boolean> {
  try {
    const canRespond = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "canSellerRespond",
      args: [requestId],
    });

    return canRespond as boolean;
  } catch (error) {
    console.error("Error checking if seller can respond:", error);
    return false;
  }
}

/**
 * Get the service provider address for an escrow contract
 * @param escrowAddress - Escrow contract address
 */
export async function getServiceProvider(
  escrowAddress: Address
): Promise<Address | null> {
  try {
    const provider = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "serviceProvider",
    });

    return provider as Address;
  } catch (error) {
    console.error("Error reading service provider from contract:", error);
    return null;
  }
}

/**
 * Get allocated balance (sum of all active request amounts)
 * @param escrowAddress - Escrow contract address
 */
export async function getAllocatedBalance(
  escrowAddress: Address
): Promise<bigint | null> {
  try {
    const balance = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "allocatedBalance",
    });

    return balance as bigint;
  } catch (error) {
    console.error("Error reading allocated balance from contract:", error);
    return null;
  }
}

/**
 * Get unallocated balance (funds available for new requests)
 * @param escrowAddress - Escrow contract address
 */
export async function getUnallocatedBalance(
  escrowAddress: Address
): Promise<bigint | null> {
  try {
    const balance = await publicClient.readContract({
      address: escrowAddress,
      abi: DisputeEscrowABI,
      functionName: "getUnallocatedBalance",
    });

    return balance as bigint;
  } catch (error) {
    console.error("Error reading unallocated balance from contract:", error);
    return null;
  }
}

/**
 * Batch get multiple request statuses
 * @param requests - Array of request IDs and escrow addresses
 */
export async function batchGetRequestStatuses(
  requests: Array<{ requestId: Hex; escrowAddress: Address }>
): Promise<Map<Hex, RequestStatus | null>> {
  const results = new Map<Hex, RequestStatus | null>();

  await Promise.all(
    requests.map(async ({ requestId, escrowAddress }) => {
      const status = await getRequestStatus(requestId, escrowAddress);
      results.set(requestId, status);
    })
  );

  return results;
}

/**
 * Batch get multiple request details with metadata
 * @param requests - Array of request IDs and escrow addresses
 */
export async function batchGetRequestDetails(
  requests: Array<{ requestId: Hex; escrowAddress: Address }>
): Promise<Map<Hex, ServiceRequestWithMetadata | null>> {
  const results = new Map<Hex, ServiceRequestWithMetadata | null>();

  await Promise.all(
    requests.map(async ({ requestId, escrowAddress }) => {
      const details = await getRequestDetailsWithMetadata(
        requestId,
        escrowAddress
      );
      results.set(requestId, details);
    })
  );

  return results;
}

/**
 * Export helper to get human-readable status description
 */
export { getStatusDescription };
