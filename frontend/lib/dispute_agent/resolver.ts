import { ethers } from 'ethers';
import { validateAgentRole } from './validator';

// DisputeEscrow contract ABI (only the function we need)
const DISPUTE_ESCROW_ABI = [
  'function resolveDispute(bytes32 requestId, bool refundBuyer) external'
];

/**
 * Resolves a dispute on-chain by calling the DisputeEscrow contract
 */
export async function resolveDisputeOnChain(
  contractAddress: string,
  requestId: string,
  refundBuyer: boolean
): Promise<string> {
  try {
    // Validate that the agent has the required role
    const hasRole = await validateAgentRole();
    if (!hasRole) {
      throw new Error('Agent does not have DISPUTE_AGENT_ROLE');
    }

    // Set up provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

    // Get the agent's address for logging
    console.log(`Agent address: ${wallet.address}`);

    // Create contract instance with signer
    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      wallet
    );

    // Estimate gas for the transaction
    const gasEstimate = await escrowContract.resolveDispute.estimateGas(
      requestId,
      refundBuyer
    );

    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    // Add 20% buffer to gas estimate
    const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    console.log(`Gas price: ${ethers.formatUnits(gasPrice || BigInt(0), 'gwei')} gwei`);

    // Execute the transaction
    const tx = await escrowContract.resolveDispute(
      requestId,
      refundBuyer,
      {
        gasLimit,
        gasPrice: gasPrice ? gasPrice * BigInt(110) / BigInt(100) : undefined // Add 10% buffer to gas price
      }
    );

    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error('Transaction failed');
    }

    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    return tx.hash;
  } catch (error) {
    console.error('Error resolving dispute on-chain:', error);

    // Check if it's a revert error and extract the reason
    if (error instanceof Error && 'reason' in error) {
      throw new Error(`Contract revert: ${(error as any).reason}`);
    }

    throw new Error(`Failed to resolve dispute on-chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simulates a dispute resolution transaction without sending it
 */
export async function simulateResolution(
  contractAddress: string,
  requestId: string,
  refundBuyer: boolean
): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      wallet
    );

    // Try to simulate the transaction
    await escrowContract.resolveDispute.staticCall(
      requestId,
      refundBuyer
    );

    return true;
  } catch (error) {
    console.error('Simulation failed:', error);
    return false;
  }
}

/**
 * Gets the transaction status
 */
export async function getTransactionStatus(txHash: string): Promise<{
  confirmed: boolean;
  blockNumber?: number;
  status?: number;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { confirmed: false };
    }

    return {
      confirmed: true,
      blockNumber: receipt.blockNumber,
      status: receipt.status ?? undefined
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return { confirmed: false };
  }
}