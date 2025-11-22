import { WebhookEvent } from '../types';
import { ethers } from 'ethers';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates incoming webhook event data
 */
export async function validateWebhookEvent(event: WebhookEvent): Promise<ValidationResult> {
  try {
    // Check required fields
    if (!event.event) {
      return { valid: false, error: 'Missing event type' };
    }

    if (!event.contractAddress) {
      return { valid: false, error: 'Missing contract address' };
    }

    if (!event.transactionHash) {
      return { valid: false, error: 'Missing transaction hash' };
    }

    if (!event.blockNumber || event.blockNumber <= 0) {
      return { valid: false, error: 'Invalid block number' };
    }

    if (!event.args || !event.args.requestId) {
      return { valid: false, error: 'Missing request ID in event args' };
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(event.contractAddress)) {
      return { valid: false, error: 'Invalid contract address format' };
    }

    // Validate transaction hash format (0x + 64 hex characters)
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!txHashRegex.test(event.transactionHash)) {
      return { valid: false, error: 'Invalid transaction hash format' };
    }

    // Validate request ID format (bytes32: 0x + 64 hex characters)
    const requestIdRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!requestIdRegex.test(event.args.requestId)) {
      return { valid: false, error: 'Invalid request ID format' };
    }

    // Validate network if specified
    const supportedNetworks = ['base-sepolia', 'base', 'ethereum-sepolia', 'ethereum'];
    if (event.network && !supportedNetworks.includes(event.network)) {
      return { valid: false, error: `Unsupported network: ${event.network}` };
    }

    // Additional validation: Check if the contract is a valid DisputeEscrow contract
    // This could be done by checking against the factory contract
    const factoryAddress = process.env.FACTORY_CONTRACT_ADDRESS;
    if (factoryAddress) {
      const isValidEscrow = await verifyEscrowContract(event.contractAddress, factoryAddress);
      if (!isValidEscrow) {
        return { valid: false, error: 'Contract is not a valid DisputeEscrow contract' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      valid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verifies that a contract address is a valid DisputeEscrow contract
 * registered with the factory
 */
async function verifyEscrowContract(
  escrowAddress: string,
  factoryAddress: string
): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Factory contract ABI (only the function we need)
    const factoryAbi = [
      'function isValidEscrow(address) view returns (bool)'
    ];

    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Check if the escrow contract is valid
    const isValid = await factoryContract.isValidEscrow(escrowAddress);

    return isValid;
  } catch (error) {
    console.error('Error verifying escrow contract:', error);
    // If we can't verify, we'll allow it to proceed but log the error
    return true;
  }
}

/**
 * Validates that the agent has the DISPUTE_AGENT_ROLE
 */
export async function validateAgentRole(): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const factoryAddress = process.env.FACTORY_CONTRACT_ADDRESS;

    if (!factoryAddress) {
      console.warn('Factory address not configured');
      return true; // Allow proceeding in development
    }

    // Get agent's address from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const agentAddress = wallet.address;

    // Factory contract ABI
    const factoryAbi = [
      'function isDisputeAgent(address) view returns (bool)'
    ];

    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Check if the agent has the dispute agent role
    const hasRole = await factoryContract.isDisputeAgent(agentAddress);

    if (!hasRole) {
      console.error(`Agent ${agentAddress} does not have DISPUTE_AGENT_ROLE`);
    }

    return hasRole;
  } catch (error) {
    console.error('Error validating agent role:', error);
    return false;
  }
}