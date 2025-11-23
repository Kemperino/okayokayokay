import { createPublicClient, http, type Address, type Hex } from 'viem';
import { base } from 'viem/chains';
import { DisputeEscrowABI, RequestStatus } from './DisputeEscrowABI';

// You'll need to provide the actual contract address
// This can be set via environment variable
const getContractAddress = (): Address => {
  const address = process.env.NEXT_PUBLIC_DISPUTE_ESCROW_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('NEXT_PUBLIC_DISPUTE_ESCROW_CONTRACT_ADDRESS not set');
  }
  return address as Address;
};

// Create a public client for reading from the contract
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

/**
 * Get the full request details from the contract
 */
export async function getRequestFromContract(
  requestId: Hex,
  contractAddress?: Address
): Promise<{
  buyer: Address;
  amount: bigint;
  escrowedAt: bigint;
  nextDeadline: bigint;
  status: RequestStatus;
  apiResponseHash: Hex;
  disputeAgent: Address;
  buyerRefunded: boolean;
  sellerRejected: boolean;
} | null> {
  try {
    const address = contractAddress || getContractAddress();

    const result = await publicClient.readContract({
      address,
      abi: DisputeEscrowABI,
      functionName: 'requests',
      args: [requestId],
    });

    // If buyer is zero address, request doesn't exist
    if (result[0] === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      buyer: result[0],
      amount: result[1],
      escrowedAt: result[2],
      nextDeadline: result[3],
      status: result[4] as RequestStatus,
      apiResponseHash: result[5],
      disputeAgent: result[6],
      buyerRefunded: result[7],
      sellerRejected: result[8],
    };
  } catch (error) {
    console.error('Error reading request from contract:', error);
    return null;
  }
}

/**
 * Get just the status of a request from the contract
 */
export async function getRequestStatusFromContract(
  requestId: Hex,
  contractAddress?: Address
): Promise<RequestStatus | null> {
  try {
    const address = contractAddress || getContractAddress();

    const status = await publicClient.readContract({
      address,
      abi: DisputeEscrowABI,
      functionName: 'getRequestStatus',
      args: [requestId],
    });

    return status as RequestStatus;
  } catch (error) {
    console.error('Error reading request status from contract:', error);
    return null;
  }
}

/**
 * Get the service provider address from the contract
 */
export async function getServiceProvider(contractAddress?: Address): Promise<Address | null> {
  try {
    const address = contractAddress || getContractAddress();

    const provider = await publicClient.readContract({
      address,
      abi: DisputeEscrowABI,
      functionName: 'serviceProvider',
    });

    return provider as Address;
  } catch (error) {
    console.error('Error reading service provider from contract:', error);
    return null;
  }
}

/**
 * Get the allocated balance from the contract
 */
export async function getAllocatedBalance(contractAddress?: Address): Promise<bigint | null> {
  try {
    const address = contractAddress || getContractAddress();

    const balance = await publicClient.readContract({
      address,
      abi: DisputeEscrowABI,
      functionName: 'allocatedBalance',
    });

    return balance as bigint;
  } catch (error) {
    console.error('Error reading allocated balance from contract:', error);
    return null;
  }
}

/**
 * Check if seller can respond to a dispute
 */
export async function canSellerRespond(
  requestId: Hex,
  contractAddress?: Address
): Promise<boolean> {
  try {
    const address = contractAddress || getContractAddress();

    const canRespond = await publicClient.readContract({
      address,
      abi: DisputeEscrowABI,
      functionName: 'canSellerRespond',
      args: [requestId],
    });

    return canRespond as boolean;
  } catch (error) {
    console.error('Error checking if seller can respond:', error);
    return false;
  }
}

/**
 * Batch fetch multiple request statuses
 */
export async function batchGetRequestStatuses(
  requestIds: Hex[],
  contractAddress?: Address
): Promise<Map<Hex, RequestStatus | null>> {
  const results = new Map<Hex, RequestStatus | null>();

  // Fetch in parallel
  await Promise.all(
    requestIds.map(async (requestId) => {
      const status = await getRequestStatusFromContract(requestId, contractAddress);
      results.set(requestId, status);
    })
  );

  return results;
}

/**
 * Convert bytes32 request ID to hex format expected by contract
 */
export function toRequestIdHex(requestId: string): Hex {
  // If already in hex format with 0x prefix
  if (requestId.startsWith('0x')) {
    return requestId as Hex;
  }

  // If it's a plain string, convert to hex
  return `0x${requestId}` as Hex;
}
