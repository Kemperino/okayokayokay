import { WebhookEvent } from './types';
import { ethers } from 'ethers';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates incoming webhook event data
 */
export async function validateWebhookEvent(payload: WebhookEvent): Promise<ValidationResult> {
  try {
    if (!payload.event?.data?.block?.logs || payload.event.data.block.logs.length === 0) {
      return { valid: false, error: 'No logs in webhook payload' };
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
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);

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

export type UserRole = 'agent' | 'merchant';

export interface RoleValidationResult {
  valid: boolean;
  address?: string;
  role?: UserRole;
  error?: string;
}

/**
 * Validates that the caller has the specified role
 * @param role - 'agent' to check DISPUTE_AGENT_ROLE, 'merchant' to check if address owns the escrow contract
 * @param contractAddress - Required for merchant role validation (to verify ownership)
 */
export async function validateAgentRole(
  role: UserRole = 'agent',
  contractAddress?: string
): Promise<RoleValidationResult> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const factoryAddress = process.env.FACTORY_CONTRACT_ADDRESS;

    if (!factoryAddress) {
      console.warn('Factory address not configured');
      return { valid: true, role }; // Allow proceeding in development
    }

    // Get address from private key
    const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
    const address = wallet.address;

    if (role === 'agent') {
      // Check if address has DISPUTE_AGENT_ROLE
      return await validateDisputeAgentRole(address, factoryAddress, provider);
    } else if (role === 'merchant') {
      // Check if address owns the escrow contract
      if (!contractAddress) {
        return {
          valid: false,
          address,
          role: 'merchant',
          error: 'Contract address required for merchant validation'
        };
      }
      return await validateMerchantRole(address, contractAddress, provider);
    } else {
      return {
        valid: false,
        address,
        error: `Unknown role: ${role}`
      };
    }
  } catch (error) {
    console.error(`Error validating ${role} role:`, error);
    return {
      valid: false,
      role,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates that an address has the DISPUTE_AGENT_ROLE
 */
async function validateDisputeAgentRole(
  address: string,
  factoryAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<RoleValidationResult> {
  try {
    const factoryAbi = [
      'function isDisputeAgent(address) view returns (bool)'
    ];

    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);
    const hasRole = await factoryContract.isDisputeAgent(address);

    if (!hasRole) {
      console.error(`Address ${address} does not have DISPUTE_AGENT_ROLE`);
      return {
        valid: false,
        address,
        role: 'agent',
        error: `Address ${address} is not a dispute agent`
      };
    }

    console.log(`Address ${address} has DISPUTE_AGENT_ROLE`);
    return {
      valid: true,
      address,
      role: 'agent'
    };
  } catch (error) {
    console.error('Error validating dispute agent role:', error);
    return {
      valid: false,
      address,
      role: 'agent',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates that an address is the merchant (service provider) for a contract
 */
async function validateMerchantRole(
  address: string,
  contractAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<RoleValidationResult> {
  try {
    // DisputeEscrow contract ABI - only the function we need
    const escrowAbi = [
      'function serviceProvider() view returns (address)'
    ];

    const escrowContract = new ethers.Contract(contractAddress, escrowAbi, provider);
    const serviceProvider = await escrowContract.serviceProvider();

    // Compare addresses (case-insensitive)
    const isOwner = serviceProvider.toLowerCase() === address.toLowerCase();

    if (!isOwner) {
      console.error(
        `Address ${address} is not the merchant. Merchant is: ${serviceProvider}`
      );
      return {
        valid: false,
        address,
        role: 'merchant',
        error: `Address ${address} is not the merchant for contract ${contractAddress}`
      };
    }

    console.log(`Address ${address} is the merchant for contract ${contractAddress}`);
    return {
      valid: true,
      address,
      role: 'merchant'
    };
  } catch (error) {
    console.error('Error validating merchant role:', error);
    return {
      valid: false,
      address,
      role: 'merchant',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
