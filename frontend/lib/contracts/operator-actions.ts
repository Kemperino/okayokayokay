import { createWalletClient, createPublicClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { DisputeEscrowABI } from './DisputeEscrowABI';

/**
 * Get the operator account from the OPERATOR_PRIVATE_KEY environment variable
 */
function getOperatorAccount() {
  const privateKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('OPERATOR_PRIVATE_KEY environment variable not set');
  }

  // Ensure the private key has the 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  return privateKeyToAccount(formattedKey as Hex);
}


/**
 * Create a wallet client for the operator
 */
function createOperatorWalletClient() {
  const account = getOperatorAccount();

  return createWalletClient({
    account,
    chain: base,
    transport: http(),
  });
}

/**
 * Create a public client for reading from the chain
 */
function createBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

/**
 * Call confirmEscrow on the DisputeEscrow contract
 *
 * @param requestId - The request ID (nonce from transferWithAuth)
 * @param buyer - The buyer address
 * @param amount - The amount in USDC (raw units, 6 decimals)
 * @param contractAddress - The escrow contract address (the 'to' address from the transfer)
 * @param apiResponseHash - The hash of the API response (can be 0x0 if not applicable)
 * @returns Transaction hash
 */
export async function callConfirmEscrow(
  requestId: Hex,
  buyer: Address,
  amount: bigint,
  contractAddress: Address,
  apiResponseHash: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000'
): Promise<{
  success: boolean;
  txHash?: Hex;
  error?: string;
}> {
  try {
    const walletClient = createOperatorWalletClient();
    const publicClient = createBasePublicClient();

    console.log('[confirmEscrow] Calling contract function...');
    console.log(`  Request ID: ${requestId}`);
    console.log(`  Buyer: ${buyer}`);
    console.log(`  Amount: ${amount.toString()}`);
    console.log(`  API Response Hash: ${apiResponseHash}`);
    console.log(`  Contract: ${contractAddress}`);
    console.log(`  Operator: ${walletClient.account.address}`);

    // Simulate the transaction first to check for errors
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: contractAddress,
      abi: DisputeEscrowABI,
      functionName: 'confirmEscrow',
      args: [requestId, buyer, amount, apiResponseHash],
    });

    // Execute the transaction
    const txHash = await walletClient.writeContract(request);

    console.log(`[confirmEscrow] Transaction sent: ${txHash}`);
    console.log('[confirmEscrow] Waiting for confirmation...');

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    console.log(`[confirmEscrow] Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`[confirmEscrow] Status: ${receipt.status}`);

    if (receipt.status === 'success') {
      console.log('[confirmEscrow] ✅ Successfully confirmed escrow on-chain');
      return {
        success: true,
        txHash,
      };
    } else {
      console.error('[confirmEscrow] ❌ Transaction reverted');
      return {
        success: false,
        txHash,
        error: 'Transaction reverted',
      };
    }

  } catch (error) {
    console.error('[confirmEscrow] Error calling confirmEscrow:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Batch call confirmEscrow for multiple transfers
 */
export async function batchConfirmEscrow(
  transfers: Array<{
    requestId: Hex;
    buyer: Address;
    amount: bigint;
    contractAddress: Address;
    apiResponseHash?: Hex;
  }>
): Promise<Array<{
  requestId: Hex;
  success: boolean;
  txHash?: Hex;
  error?: string;
}>> {
  const results = [];

  for (const transfer of transfers) {
    const result = await callConfirmEscrow(
      transfer.requestId,
      transfer.buyer,
      transfer.amount,
      transfer.contractAddress,
      transfer.apiResponseHash
    );

    results.push({
      requestId: transfer.requestId,
      ...result,
    });
  }

  return results;
}
