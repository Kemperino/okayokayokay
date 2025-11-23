import { handleDispute } from "./dispute-handler";
import { ethers } from "ethers";
import { DisputeEscrowABI } from '@/lib/contracts/DisputeEscrowABI';

// Alchemy GraphQL webhook format
export interface AlchemyWebhookPayload {
  webhookId: string;
  type: 'GRAPHQL';
  event: {
    data: {
      block: {
        logs: Array<{
          account: { address: string };
          topics: string[];
          data: string;
          transaction: {
            hash: string;
          };
        }>;
      };
    };
    network: string;
  };
}

// Legacy test webhook format
export interface LegacyWebhookEvent {
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

export type WebhookEvent = AlchemyWebhookPayload | LegacyWebhookEvent;

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

const DISPUTE_OPENED_SIGNATURE = ethers.id('DisputeOpened(bytes32,address)');

/**
 * Check if payload is Alchemy GraphQL format
 */
function isAlchemyWebhook(payload: WebhookEvent): payload is AlchemyWebhookPayload {
  return 'webhookId' in payload && 'event' in payload && typeof payload.event === 'object';
}

/**
 * Merchant webhook handler for responding to dispute events
 * Makes a random 50/50 decision to accept or reject the dispute
 * Supports both Alchemy GraphQL webhooks and legacy test format
 */
export async function merchantHandlingDisputes(
  payload: WebhookEvent
): Promise<WebhookResult> {
  console.log("Processing merchant dispute webhook:", new Date().toISOString());

  try {
    let requestId: string;
    let contractAddress: string;

    // Parse based on webhook format
    if (isAlchemyWebhook(payload)) {
      console.log('Parsing Alchemy GraphQL webhook format');
      
      // Validate Alchemy payload structure
      if (!payload.event?.data?.block?.logs) {
        return { 
          success: true, 
          message: "No logs in webhook payload" 
        };
      }

      const logs = payload.event.data.block.logs;
      
      if (logs.length === 0) {
        return { 
          success: true, 
          message: "No logs to process" 
        };
      }

      // Find DisputeOpened event
      let disputeLog = null;
      for (const log of logs) {
        if (log.topics[0] === DISPUTE_OPENED_SIGNATURE) {
          disputeLog = log;
          break;
        }
      }

      if (!disputeLog) {
        console.log('No DisputeOpened event found in logs');
        return {
          success: true,
          message: "No DisputeOpened event in payload"
        };
      }

      // Decode the event
      const iface = new ethers.Interface(DisputeEscrowABI);
      const decoded = iface.parseLog({
        topics: disputeLog.topics,
        data: disputeLog.data,
      });

      if (!decoded) {
        return { success: false, error: "Failed to decode DisputeOpened event" };
      }

      requestId = decoded.args[0];
      contractAddress = disputeLog.account.address;

      console.log(`Decoded Alchemy webhook: requestId=${requestId}, contract=${contractAddress}`);
    } else {
      // Legacy test format
      console.log('Parsing legacy test webhook format');
      
      if (!payload.event) {
        return { success: false, error: "Missing event type" };
      }

      if (!payload.contractAddress) {
        return { success: false, error: "Missing contract address" };
      }

      if (!payload.args?.requestId) {
        return { success: false, error: "Missing request ID" };
      }

      // Only process DisputeOpened events
      if (payload.event !== "DisputeOpened") {
        console.log(`Ignoring event type: ${payload.event}`);
        return {
          success: true,
          message: "Event type not handled",
        };
      }

      requestId = payload.args.requestId;
      contractAddress = payload.contractAddress;
    }

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
