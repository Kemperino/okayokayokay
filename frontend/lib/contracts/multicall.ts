import { createPublicClient, http, type Address, type Hex } from 'viem';
import { base } from 'viem/chains';
import { DisputeEscrowABI } from './DisputeEscrowABI';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || undefined),
  batch: {
    multicall: true,
  },
});

export interface BatchStatusRequest {
  requestId: Hex;
  escrowAddress: Address;
}

export interface BatchStatusResult {
  requestId: Hex;
  escrowAddress: Address;
  status: number | null;
  error?: string;
}

/**
 * Batch fetch request statuses using viem's built-in multicall
 * This makes ONE RPC call instead of N calls
 */
export async function batchGetRequestStatuses(
  requests: BatchStatusRequest[]
): Promise<BatchStatusResult[]> {
  if (requests.length === 0) {
    return [];
  }

  console.log(`[multicall] Fetching ${requests.length} statuses in one batch call`);

  try {
    // Use multicall to batch all requests into one RPC call
    const results = await publicClient.multicall({
      contracts: requests.map((req) => ({
        address: req.escrowAddress,
        abi: DisputeEscrowABI,
        functionName: 'getRequestStatus',
        args: [req.requestId],
      })),
      allowFailure: true,
    });

    console.log(`[multicall] Received ${results.length} results`);

    return requests.map((req, index) => {
      const result = results[index];

      if (result.status === 'success' && result.result !== undefined) {
        return {
          requestId: req.requestId,
          escrowAddress: req.escrowAddress,
          status: Number(result.result),
        };
      }

      return {
        requestId: req.requestId,
        escrowAddress: req.escrowAddress,
        status: null,
        error: result.status === 'failure' ? result.error?.message : 'Unknown error',
      };
    });
  } catch (error) {
    console.error('[multicall] Batch fetch failed:', error);
    throw error;
  }
}

/**
 * Batch fetch full request details (more expensive, use sparingly)
 */
export async function batchGetRequestDetails(
  requests: BatchStatusRequest[]
): Promise<Array<{
  requestId: Hex;
  escrowAddress: Address;
  data: any;
  error?: string;
}>> {
  if (requests.length === 0) {
    return [];
  }

  console.log(`[multicall] Fetching ${requests.length} full request details`);

  try {
    const results = await publicClient.multicall({
      contracts: requests.map((req) => ({
        address: req.escrowAddress,
        abi: DisputeEscrowABI,
        functionName: 'requests',
        args: [req.requestId],
      })),
      allowFailure: true,
    });

    return requests.map((req, index) => {
      const result = results[index];

      if (result.status === 'success') {
        return {
          requestId: req.requestId,
          escrowAddress: req.escrowAddress,
          data: result.result,
        };
      }

      return {
        requestId: req.requestId,
        escrowAddress: req.escrowAddress,
        data: null,
        error: result.status === 'failure' ? result.error?.message : 'Unknown error',
      };
    });
  } catch (error) {
    console.error('[multicall] Batch fetch details failed:', error);
    throw error;
  }
}

