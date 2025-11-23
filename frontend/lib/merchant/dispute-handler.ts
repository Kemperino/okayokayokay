import { ethers } from "ethers";

// DisputeEscrow contract ABI (only the function we need)
const DISPUTE_ESCROW_ABI = [
  "function respondToDispute(bytes32 requestId, bool acceptRefund) external",
];

/**
 * Responds to a dispute on-chain as the merchant/service provider
 * @param contractAddress - The dispute escrow contract address
 * @param requestId - The request ID for the dispute
 * @param acceptRefund - Whether to accept the refund request (true) or reject it (false)
 */
export async function handleDispute(
  contractAddress: string,
  requestId: string,
  acceptRefund: boolean
): Promise<string> {
  try {
    // Set up provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.WEATHER_SERVICE_PRIVATE_KEY!, provider);

    // Get the merchant's address for logging
    console.log(`Merchant address: ${wallet.address}`);

    // Create contract instance with signer
    const escrowContract = new ethers.Contract(
      contractAddress,
      DISPUTE_ESCROW_ABI,
      wallet
    );

    // First, simulate the transaction to get better error messages
    try {
      console.log(`Simulating respondToDispute(${requestId}, ${acceptRefund})...`);
      await escrowContract.respondToDispute.staticCall(requestId, acceptRefund);
      console.log("Simulation successful");
    } catch (simError: any) {
      console.error("Simulation failed:", simError);

      // Try to extract the revert reason
      let revertReason = "Unknown";
      if (simError.reason) {
        revertReason = simError.reason;
      } else if (simError.errorName) {
        revertReason = simError.errorName;
      } else if (simError.message) {
        // Try to extract custom error from message
        const match = simError.message.match(/reverted with reason string '(.+)'/);
        if (match) revertReason = match[1];
      }

      throw new Error(`Transaction would revert: ${revertReason}`);
    }

    // Estimate gas for the transaction
    const gasEstimate = await escrowContract.respondToDispute.estimateGas(
      requestId,
      acceptRefund
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
    console.error("Error responding to dispute on-chain:", error);

    // Check if it's a revert error and extract the reason
    if (error instanceof Error && "reason" in error) {
      throw new Error(`Contract revert: ${(error as any).reason}`);
    }

    throw new Error(
      `Failed to respond to dispute on-chain: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
