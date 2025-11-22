'use server';

import { getRequestStatus, RequestStatusLabels, RequestStatus } from '@/lib/contracts';
import type { Hex, Address } from 'viem';

export interface ContractStatusResult {
  status: RequestStatus | null;
  statusLabel: string;
  hasStatus: boolean;
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
      statusLabel: 'No escrow',
      hasStatus: false,
    };
  }

  try {
    // Ensure request ID is in hex format
    const requestIdHex = requestId.startsWith('0x') ? (requestId as Hex) : (`0x${requestId}` as Hex);

    console.log('[getContractStatus] Querying contract:', {
      requestId: requestIdHex,
      escrowAddress: escrowContractAddress,
    });

    // Fetch status from blockchain
    const status = await getRequestStatus(requestIdHex, escrowContractAddress as Address);

    console.log('[getContractStatus] Contract returned status:', status);

    if (status === null) {
      return {
        status: null,
        statusLabel: 'Not found',
        hasStatus: false,
      };
    }

    return {
      status,
      statusLabel: RequestStatusLabels[status],
      hasStatus: true,
    };
  } catch (error) {
    console.error('[getContractStatus] Error fetching contract status:', error);
    return {
      status: null,
      statusLabel: 'Error fetching',
      hasStatus: false,
    };
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
