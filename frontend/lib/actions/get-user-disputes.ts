'use server';

import { getResourceRequestsByUser } from '@/lib/queries/resources.server';
import { RequestStatus, RequestStatusLabels } from '@/lib/contracts/DisputeEscrowABI';
import { batchGetRequestStatuses } from '@/lib/contracts/multicall';
import type { ResourceRequest } from '@/lib/queries/resources.server';
import type { ContractStatusResult } from './get-contract-status';
import type { Hex, Address } from 'viem';

export interface DisputeWithStatus extends ResourceRequest {
  contractStatus: ContractStatusResult;
}

const DISPUTE_STATUSES = [
  RequestStatus.DisputeOpened,
  RequestStatus.SellerAccepted,
  RequestStatus.DisputeEscalated,
  RequestStatus.DisputeResolved,
];

/**
 * Fetch user's resource requests and filter to only show dispute-related statuses
 * Uses multicall for optimal performance - ONE RPC call instead of N calls
 */
export async function getUserDisputes(userAddress: string): Promise<DisputeWithStatus[]> {
  const { data: requests, error } = await getResourceRequestsByUser(userAddress, 100);

  if (error || !requests) {
    console.error('[getUserDisputes] Error fetching requests:', error);
    return [];
  }

  const requestsWithEscrow = requests.filter(r => r.escrow_contract_address);

  if (requestsWithEscrow.length === 0) {
    return [];
  }

  const batchRequests = requestsWithEscrow.map(request => ({
    requestId: (request.request_id.startsWith('0x') ? request.request_id : `0x${request.request_id}`) as Hex,
    escrowAddress: request.escrow_contract_address as Address,
  }));

  const statusResults = await batchGetRequestStatuses(batchRequests);

  const disputes = requestsWithEscrow
    .map((request, index) => {
      const statusResult = statusResults[index];
      
      if (!statusResult || statusResult.status === null) {
        return null;
      }

      if (!DISPUTE_STATUSES.includes(statusResult.status)) {
        return null;
      }

      return {
        ...request,
        contractStatus: {
          status: statusResult.status,
          statusLabel: RequestStatusLabels[statusResult.status as RequestStatus],
          hasStatus: true,
        },
      };
    })
    .filter((dispute): dispute is DisputeWithStatus => dispute !== null);

  return disputes;
}

