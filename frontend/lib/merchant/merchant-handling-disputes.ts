import { handleDispute } from "./dispute-handler";
import { ethers } from "ethers";

export interface WebhookEvent {
  event: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  network?: string;
  args: {
    requestId: string;
    buyer?: string;
    amount?: string;
  };
}

export interface WebhookResult {
  success: boolean;
  requestId?: string;
  decision?: {
    acceptRefund: boolean;
    reason: string;
  };
  transactionHash?: string;
  error?: string;
  message?: string;
}

/**
 * Merchant webhook handler for responding to dispute events
 * Makes a random 50/50 decision to accept or reject the dispute
 */
export async function merchantHandlingDisputes(
  webhookEvent: WebhookEvent
): Promise<WebhookResult> {
  console.log("Processing merchant dispute webhook:", new Date().toISOString());

  try {
    // 1. Basic validation
    if (!webhookEvent.event) {
      return { success: false, error: "Missing event type" };
    }

    if (!webhookEvent.contractAddress) {
      return { success: false, error: "Missing contract address" };
    }

    if (!webhookEvent.args?.requestId) {
      return { success: false, error: "Missing request ID" };
    }

    // 2. Only process DisputeOpened events
    if (webhookEvent.event !== "DisputeOpened") {
      console.log(`Ignoring event type: ${webhookEvent.event}`);
      return {
        success: true,
        message: "Event type not handled",
      };
    }

    const { requestId } = webhookEvent.args;
    const { contractAddress } = webhookEvent;

    // 3. Validate addresses and request ID format
    if (!ethers.isAddress(contractAddress)) {
      return { success: false, error: "Invalid contract address format" };
    }

    const requestIdRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!requestIdRegex.test(requestId)) {
      return { success: false, error: "Invalid request ID format" };
    }

    console.log(
      `Processing dispute for request ${requestId} in contract ${contractAddress}`
    );

    // 4. Make random decision (50/50 chance)
    const acceptRefund = Math.random() > 0.5;
    const decision = {
      acceptRefund,
      reason: acceptRefund
        ? "Merchant accepts the refund request"
        : "Merchant rejects the dispute and will escalate to agent arbitration"
    };

    console.log(
      `Merchant decision: ${acceptRefund ? "ACCEPT" : "REJECT"} refund for request ${requestId}`
    );

    // 5. Execute on-chain response (can be disabled for testing)
    let transactionHash: string | undefined;

    if (process.env.SKIP_BLOCKCHAIN_CALLS === "true") {
      console.log("Skipping blockchain call (TEST_MODE)");
      transactionHash = "0x" + "0".repeat(64); // Mock transaction hash
    } else {
      try {
        console.log("Executing on-chain dispute response...");
        transactionHash = await handleDispute(
          contractAddress,
          requestId,
          acceptRefund
        );
        console.log(
          `Dispute response sent on-chain. Transaction hash: ${transactionHash}`
        );
      } catch (error) {
        console.error("Failed to execute on-chain response:", error);
        return {
          success: false,
          error: "Failed to execute on-chain response",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // 6. Return success response with decision details
    return {
      success: true,
      requestId,
      decision,
      transactionHash,
    };
  } catch (error) {
    console.error("Error processing merchant dispute:", error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    return {
      success: false,
      error: "Failed to process merchant dispute",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}