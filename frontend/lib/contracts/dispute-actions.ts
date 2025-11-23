/**
 * Buyer dispute actions using CDP Server Wallets
 * These functions are called from the customer interface with session-based CDP wallets
 */

import { encodeFunctionData, type Hex } from 'viem';
import { base } from 'viem/chains';
import { DisputeEscrowABI } from './DisputeEscrowABI';
import { getAnonymousCdpAccount } from '@/lib/cdp/session-wallet';
import { cdpClient } from '@/lib/cdp/client';
import type {
  OpenDisputeParams,
  EscalateDisputeParams,
  EarlyReleaseParams,
  CancelDisputeParams,
  TransactionResult,
} from './types';

/**
 * Open a dispute as a buyer using CDP wallet
 * @param sessionId - Browser session ID for CDP wallet
 * @param params - Dispute parameters
 */
export async function openDispute(
  sessionId: string,
  params: OpenDisputeParams
): Promise<TransactionResult> {
  try {
    // Get CDP account for this session
    const account = await getAnonymousCdpAccount(sessionId);

    console.log('[openDispute] Transaction details:', {
      from: account.address,
      to: params.escrowAddress,
      requestId: params.requestId,
      network: 'base',
    });

    // Encode the transaction data
    const data = encodeFunctionData({
      abi: DisputeEscrowABI,
      functionName: 'openDispute',
      args: [params.requestId],
    });

    console.log('[openDispute] Encoded data:', data);

    // Send transaction via CDP
    const txResult = await cdpClient.evm.sendTransaction({
      address: account.address,
      network: 'base',
      transaction: {
        to: params.escrowAddress,
        data,
      },
    });

    console.log('[openDispute] Transaction submitted:', txResult.transactionHash);

    return {
      success: true,
      transactionHash: txResult.transactionHash as Hex,
    };
  } catch (error) {
    console.error('[openDispute] Error details:', {
      error,
      sessionId,
      requestId: params.requestId,
      escrowAddress: params.escrowAddress,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Escalate a dispute as a buyer using CDP wallet
 * Can be called if:
 * 1. Seller didn't respond and deadline passed
 * 2. Seller rejected and buyer is within escalation window
 *
 * @param sessionId - Browser session ID for CDP wallet
 * @param params - Escalation parameters
 */
export async function escalateDispute(
  sessionId: string,
  params: EscalateDisputeParams
): Promise<TransactionResult> {
  try {
    const account = await getAnonymousCdpAccount(sessionId);

    const data = encodeFunctionData({
      abi: DisputeEscrowABI,
      functionName: 'escalateDispute',
      args: [params.requestId],
    });

    const txResult = await cdpClient.evm.sendTransaction({
      address: account.address,
      network: 'base',
      transaction: {
        to: params.escrowAddress,
        data,
      },
    });

    return {
      success: true,
      transactionHash: txResult.transactionHash as Hex,
    };
  } catch (error) {
    console.error('Error escalating dispute:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Early release escrow as a buyer (if satisfied with service)
 * @param sessionId - Browser session ID for CDP wallet
 * @param params - Early release parameters
 */
export async function earlyReleaseEscrow(
  sessionId: string,
  params: EarlyReleaseParams
): Promise<TransactionResult> {
  try {
    const account = await getAnonymousCdpAccount(sessionId);

    const data = encodeFunctionData({
      abi: DisputeEscrowABI,
      functionName: 'earlyRelease',
      args: [params.requestId],
    });

    const txResult = await cdpClient.evm.sendTransaction({
      address: account.address,
      network: 'base',
      transaction: {
        to: params.escrowAddress,
        data,
      },
    });

    return {
      success: true,
      transactionHash: txResult.transactionHash as Hex,
    };
  } catch (error) {
    console.error('Error releasing escrow early:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel a dispute as a buyer
 * Can cancel disputes that are either DisputeOpened or DisputeEscalated
 * Resets to Escrowed status with expired deadline so seller can withdraw
 *
 * @param sessionId - Browser session ID for CDP wallet
 * @param params - Cancel parameters
 */
export async function cancelDispute(
  sessionId: string,
  params: CancelDisputeParams
): Promise<TransactionResult> {
  try {
    const account = await getAnonymousCdpAccount(sessionId);

    const data = encodeFunctionData({
      abi: DisputeEscrowABI,
      functionName: 'cancelDispute',
      args: [params.requestId],
    });

    const txResult = await cdpClient.evm.sendTransaction({
      address: account.address,
      network: 'base',
      transaction: {
        to: params.escrowAddress,
        data,
      },
    });

    return {
      success: true,
      transactionHash: txResult.transactionHash as Hex,
    };
  } catch (error) {
    console.error('Error canceling dispute:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
