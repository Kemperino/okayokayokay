/**
 * Helper functions for working with dispute escrow contracts
 */

import { getEscrowAddressForService } from './status-queries';
import type { Address } from 'viem';

/**
 * Get or cache escrow address for a service provider
 * This should be called when processing payments to determine the correct escrow contract
 */
export async function getEscrowAddressForMerchant(
  merchantAddress: string
): Promise<string | null> {
  try {
    const escrowAddress = await getEscrowAddressForService(merchantAddress as Address);
    return escrowAddress;
  } catch (error) {
    console.error('Error fetching escrow address for merchant:', error);
    return null;
  }
}

/**
 * Ensure address is in proper hex format
 */
export function toChecksumAddress(address: string): Address {
  return address.toLowerCase() as Address;
}
