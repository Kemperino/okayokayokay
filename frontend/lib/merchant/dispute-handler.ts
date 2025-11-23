import { ethers } from "ethers";
import { validateAgentRole } from "../dispute_agent/validator";

// DisputeEscrow contract ABI (only the function we need)
const DISPUTE_ESCROW_ABI = [
  "function resolveDispute(bytes32 requestId, bool acceptRefund) external",
];

/**
 * Resolves a dispute on-chain by calling the DisputeEscrow contract
 */
export async function handleDispute(
  contractAddress: string,
  requestId: string,
  acceptRefund: boolean
): Promise<string> {
  try {
    // Validate that the merchant owns this escrow contract
    const validation = await validateAgentRole("merchant", contractAddress);
    if (!validation.valid) {
      throw new Error(validation.error || "Merchant validation failed");
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
    const gasEstimate = await escrowContract.respondToDispute.estimateGas(
      requestId,
      0 // false
    );

    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    console.log(
      `Gas price: ${ethers.formatUnits(gasPrice || BigInt(0), "gwei")} gwei`
    );

    // Execute the transaction
    const tx = await escrowContract.respondToDispute(requestId, acceptRefund, {
      gasLimit,
      gasPrice: gasPrice ? (gasPrice * BigInt(110)) / BigInt(100) : undefined, // Add 10% buffer to gas price
    });

    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    return tx.hash;
  } catch (error) {
    console.error("Error resolving dispute on-chain:", error);

    // Check if it's a revert error and extract the reason
    if (error instanceof Error && "reason" in error) {
      throw new Error(`Contract revert: ${(error as any).reason}`);
    }

    throw new Error(
      `Failed to resolve dispute on-chain: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
