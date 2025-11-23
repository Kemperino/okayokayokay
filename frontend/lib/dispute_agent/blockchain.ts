import { ethers } from 'ethers';
import { ServiceRequest } from '../contracts/types';

// DisputeEscrow contract ABI (only the functions we need)
const DISPUTE_ESCROW_ABI = [
  'function requests(bytes32) view returns (address buyer, uint256 amount, uint256 escrowedAt, uint256 nextDeadline, uint8 status, bytes32 apiResponseHash, address disputeAgent, bool buyerRefunded, bool sellerRejected)',
  'function getRequestStatus(bytes32) view returns (uint8)',
  'function serviceProvider() view returns (address)',
  'function serviceMetadataURI() view returns (string)',
  'function resolveDispute(bytes32 requestId, bool refundBuyer) external'
];

/**
 * Fetches request details from the DisputeEscrow contract
 */
export async function fetchRequestDetails(
  contractAddress: string,
  requestId: string
): Promise<ServiceRequest> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      provider
    );

    // Fetch request details from the contract
    const requestData = await escrowContract.requests(requestId);

    // Parse the response into our ServiceRequest type
    const serviceRequest: ServiceRequest = {
      buyer: requestData[0],
      amount: requestData[1],
      escrowedAt: requestData[2],
      nextDeadline: requestData[3],
      status: Number(requestData[4]),
      apiResponseHash: requestData[5],
      disputeAgent: requestData[6],
      buyerRefunded: requestData[7],
      sellerRejected: requestData[8]
    };

    return serviceRequest;
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw new Error(`Failed to fetch request details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets the service provider address for a DisputeEscrow contract
 */
export async function getServiceProvider(contractAddress: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      provider
    );

    const serviceProvider = await escrowContract.serviceProvider();
    return serviceProvider;
  } catch (error) {
    console.error('Error fetching service provider:', error);
    throw new Error(`Failed to fetch service provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets the current status of a request
 */
export async function getRequestStatus(
  contractAddress: string,
  requestId: string
): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      provider
    );

    const status = await escrowContract.getRequestStatus(requestId);
    return Number(status);
  } catch (error) {
    console.error('Error fetching request status:', error);
    throw new Error(`Failed to fetch request status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Formats an amount from wei to a readable format
 */
export function formatAmount(amount: bigint, decimals: number = 6): string {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Parses an amount from readable format to wei
 */
export function parseAmount(amount: string, decimals: number = 6): bigint {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Gets the service metadata URI from a DisputeEscrow contract
 */
export async function getServiceMetadataURI(contractAddress: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      provider
    );

    const metadataURI = await escrowContract.serviceMetadataURI();
    return metadataURI;
  } catch (error) {
    console.error('Error fetching service metadata URI:', error);
    throw new Error(`Failed to fetch service metadata URI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}