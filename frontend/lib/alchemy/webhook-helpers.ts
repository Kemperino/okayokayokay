/**
 * Utility functions for Alchemy webhook integration
 */

/**
 * Pad a 20-byte Ethereum address to 32 bytes for use in event topics
 *
 * @param address - Ethereum address (0x + 40 hex chars)
 * @returns Padded address (0x + 64 hex chars)
 *
 * @example
 * padAddressForTopics("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
 * // Returns: "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
 */
export function padAddressForTopics(address: string): string {
  const cleaned = address.toLowerCase().replace(/^0x/, '');
  if (cleaned.length !== 40) {
    throw new Error(`Invalid address length: ${address}. Expected 40 hex chars (20 bytes).`);
  }
  return '0x' + cleaned.padStart(64, '0');
}

/**
 * Generate padded addresses for multiple addresses
 *
 * @param addresses - Array of Ethereum addresses
 * @returns Array of padded addresses ready for Alchemy GraphQL topics
 *
 * @example
 * generatePaddedTopics(["0xaaaa...", "0xbbbb..."])
 * // Returns: ["0x000000000000000000000000aaaa...", "0x000000000000000000000000bbbb..."]
 */
export function generatePaddedTopics(addresses: string[]): string[] {
  return addresses.map(padAddressForTopics);
}

/**
 * Clean a padded 32-byte address back to standard 20-byte format
 *
 * @param paddedAddress - Padded address from event topics (0x + 64 hex chars)
 * @returns Standard Ethereum address (0x + 40 hex chars)
 *
 * @example
 * cleanPaddedAddress("0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
 * // Returns: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
 */
export function cleanPaddedAddress(paddedAddress: string | undefined): string | null {
  if (!paddedAddress) return null;

  const cleaned = paddedAddress.replace(/^0x0*/, '0x');

  // If already 20 bytes (42 chars with 0x), return as-is
  if (cleaned.length === 42) {
    return cleaned.toLowerCase();
  }

  // If 32 bytes (66 chars with 0x), take last 40 hex chars
  if (paddedAddress.length === 66) {
    return '0x' + paddedAddress.slice(-40).toLowerCase();
  }

  return cleaned.toLowerCase();
}

/**
 * Event signatures for USDC and EIP-3009 events
 */
export const EVENT_SIGNATURES = {
  // ERC-20 Transfer event
  // keccak256("Transfer(address,address,uint256)")
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',

  // EIP-3009 AuthorizationUsed event
  // keccak256("AuthorizationUsed(address,bytes32)")
  AUTHORIZATION_USED: '0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5',
} as const;

/**
 * USDC contract address on Base
 */
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/**
 * Generate Alchemy GraphQL query for monitoring USDC transfers
 *
 * @param watchlistAddresses - Array of addresses to monitor
 * @returns GraphQL query string ready for Alchemy webhook
 */
export function generateAlchemyGraphQLQuery(watchlistAddresses: string[]): string {
  const paddedAddresses = generatePaddedTopics(watchlistAddresses);
  const addressesJson = JSON.stringify(paddedAddresses, null, 12);

  return `{
  block {
    hash
    number
    timestamp
    logs(
      filter: {
        addresses: ["${USDC_BASE}"]
        topics: [
          ["${EVENT_SIGNATURES.TRANSFER}"]
          []
          ${addressesJson}
        ]
      }
    ) {
      account { address }
      topics
      data
      index
      transaction {
        hash
        from { address }
        to { address }
        status
        logs {
          account { address }
          topics
          data
          index
        }
      }
    }
  }
}`;
}

/**
 * Format USDC amount from raw units (6 decimals) to human-readable string
 *
 * @param rawAmount - Raw USDC amount (string or bigint)
 * @returns Formatted amount with 6 decimal places
 *
 * @example
 * formatUSDCAmount("10000")
 * // Returns: "0.010000"
 */
export function formatUSDCAmount(rawAmount: string | bigint): string {
  const amount = typeof rawAmount === 'string' ? BigInt(rawAmount) : rawAmount;
  const divisor = BigInt(1_000_000); // 6 decimals
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  return `${wholePart}.${fractionalPart.toString().padStart(6, '0')}`;
}
