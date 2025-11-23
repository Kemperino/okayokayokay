import { keccak256, toBytes, type Hex } from 'viem';

/**
 * Convert a PieceCID string to a bytes32 hash for on-chain storage
 *
 * The smart contract stores a bytes32 `apiResponseHash`. We use keccak256
 * of the PieceCID string to create a deterministic 32-byte hash that can
 * be verified on-chain.
 *
 * @param pieceCid - The PieceCID string from Filecoin upload
 * @returns A bytes32 hex string suitable for on-chain storage
 */
export function pieceCidToBytes32(pieceCid: string): Hex {
  // Convert the PieceCID string to bytes and hash with keccak256
  const bytes = toBytes(pieceCid);
  return keccak256(bytes);
}

/**
 * Verify that a given bytes32 hash matches a PieceCID
 *
 * @param hash - The bytes32 hash stored on-chain
 * @param pieceCid - The PieceCID to verify
 * @returns True if the hash matches the PieceCID
 */
export function verifyPieceCidHash(hash: Hex, pieceCid: string): boolean {
  const computedHash = pieceCidToBytes32(pieceCid);
  return computedHash.toLowerCase() === hash.toLowerCase();
}

/**
 * Create a zero hash (used as fallback when upload fails)
 *
 * @returns The zero bytes32 hash
 */
export function getZeroHash(): Hex {
  return '0x0000000000000000000000000000000000000000000000000000000000000000';
}
