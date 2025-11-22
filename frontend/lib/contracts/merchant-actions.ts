/**
 * Merchant dispute actions using wagmi/WalletConnect
 * These functions are called from the merchant interface with connected wallets (MetaMask, Coinbase Wallet, etc.)
 */

import { writeContract, waitForTransactionReceipt, type Config } from '@wagmi/core';
import type { Hex } from 'viem';
import { DisputeEscrowABI } from './DisputeEscrowABI';
import { wagmiConfig } from '@/lib/wagmi-config';
import type { RespondToDisputeParams, ReleaseEscrowParams, TransactionResult } from './types';

/**
 * Respond to a dispute as a merchant using wagmi
 * @param config - Wagmi config (or use default)
 * @param params - Response parameters
 */
export async function respondToDispute(
  params: RespondToDisputeParams,
  config: Config = wagmiConfig
): Promise<TransactionResult> {
  try {
    // Write the transaction
    const hash = await writeContract(config, {
      address: params.escrowAddress,
      abi: DisputeEscrowABI,
      functionName: 'respondToDispute',
      args: [params.requestId, params.acceptRefund],
    });

    // Wait for confirmation
    await waitForTransactionReceipt(config, {
      hash,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    console.error('Error responding to dispute:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Release escrow funds to merchant using wagmi
 * Can be called by anyone (permissionless) when:
 * 1. Status is Escrowed and dispute deadline passed
 * 2. Status is DisputeOpened, seller rejected, and escalation deadline passed
 * 3. Status is DisputeOpened, seller didn't respond, and buyer escalation window passed
 *
 * @param config - Wagmi config (or use default)
 * @param params - Release parameters
 */
export async function releaseEscrow(
  params: ReleaseEscrowParams,
  config: Config = wagmiConfig
): Promise<TransactionResult> {
  try {
    const hash = await writeContract(config, {
      address: params.escrowAddress,
      abi: DisputeEscrowABI,
      functionName: 'releaseEscrow',
      args: [params.requestId],
    });

    await waitForTransactionReceipt(config, {
      hash,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    console.error('Error releasing escrow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch release multiple escrows (useful for merchants with many completed transactions)
 * @param requestParams - Array of release parameters
 * @param config - Wagmi config (or use default)
 */
export async function batchReleaseEscrow(
  requestParams: ReleaseEscrowParams[],
  config: Config = wagmiConfig
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = [];

  for (const params of requestParams) {
    const result = await releaseEscrow(params, config);
    results.push(result);

    // Add a small delay between transactions to avoid nonce issues
    if (result.success) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Check if merchant can respond to a specific dispute
 * @param params - Response parameters (without acceptRefund decision)
 * @param config - Wagmi config (or use default)
 */
export async function canMerchantRespondToDispute(
  params: { requestId: Hex; escrowAddress: `0x${string}` },
  config: Config = wagmiConfig
): Promise<boolean> {
  try {
    const { readContract } = await import('@wagmi/core');

    const canRespond = await readContract(config, {
      address: params.escrowAddress,
      abi: DisputeEscrowABI,
      functionName: 'canSellerRespond',
      args: [params.requestId],
    });

    return canRespond as boolean;
  } catch (error) {
    console.error('Error checking if merchant can respond:', error);
    return false;
  }
}
