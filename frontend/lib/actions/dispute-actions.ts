'use server';

import { openDispute, escalateDispute, earlyReleaseEscrow, cancelDispute } from '@/lib/contracts/dispute-actions';
import type { Hex, Address } from 'viem';

export interface DisputeActionResult {
  success: boolean;
  transactionHash?: Hex;
  error?: string;
}

/**
 * File a dispute as a buyer
 */
export async function fileDispute(
  sessionId: string,
  requestId: string,
  escrowAddress: string
): Promise<DisputeActionResult> {
  try {
    const requestIdHex = requestId.startsWith('0x') ? (requestId as Hex) : (`0x${requestId}` as Hex);

    const result = await openDispute(sessionId, {
      requestId: requestIdHex,
      escrowAddress: escrowAddress as Address,
    });

    return result;
  } catch (error) {
    console.error('[fileDispute] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Escalate a dispute to the next level (dispute agent)
 */
export async function escalateDisputeAction(
  sessionId: string,
  requestId: string,
  escrowAddress: string
): Promise<DisputeActionResult> {
  try {
    const requestIdHex = requestId.startsWith('0x') ? (requestId as Hex) : (`0x${requestId}` as Hex);

    const result = await escalateDispute(sessionId, {
      requestId: requestIdHex,
      escrowAddress: escrowAddress as Address,
    });

    return result;
  } catch (error) {
    console.error('[escalateDisputeAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Release escrow early as a satisfied buyer
 */
export async function earlyReleaseAction(
  sessionId: string,
  requestId: string,
  escrowAddress: string
): Promise<DisputeActionResult> {
  try {
    const requestIdHex = requestId.startsWith('0x') ? (requestId as Hex) : (`0x${requestId}` as Hex);

    const result = await earlyReleaseEscrow(sessionId, {
      requestId: requestIdHex,
      escrowAddress: escrowAddress as Address,
    });

    return result;
  } catch (error) {
    console.error('[earlyReleaseAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel a dispute as a buyer
 */
export async function cancelDisputeAction(
  sessionId: string,
  requestId: string,
  escrowAddress: string
): Promise<DisputeActionResult> {
  try {
    const requestIdHex = requestId.startsWith('0x') ? (requestId as Hex) : (`0x${requestId}` as Hex);

    const result = await cancelDispute(sessionId, {
      requestId: requestIdHex,
      escrowAddress: escrowAddress as Address,
    });

    return result;
  } catch (error) {
    console.error('[cancelDisputeAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
