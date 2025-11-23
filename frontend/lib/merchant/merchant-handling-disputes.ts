import { validateWebhookEvent } from "../dispute_agent/validator";
import {
  fetchRequestDetails,
  getServiceMetadataURI,
} from "../dispute_agent/blockchain";
import { fetchResourceRequestData } from "../dispute_agent/supabase";
import { fetchServiceMetadata } from "../dispute_agent/metadata";
import { makeDisputeDecision } from "../dispute_agent/llm";
import { handleDispute } from "./dispute-handler";
import {
  WebhookEvent,
  DisputeContext,
  RequestStatus,
} from "../dispute_agent/types";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: __dirname + "/../../.env" });

export interface WebhookResult {
  success: boolean;
  requestId?: string;
  decision?: {
    refund: boolean;
    reason: string;
  };
  transactionHash?: string;
  error?: string;
  message?: string;
}

/**
 * Main webhook handler logic extracted for reusability
 */
export async function merchantHandlingDisputes(
  webhookEvent: WebhookEvent
): Promise<WebhookResult> {
  console.log("Processing dispute webhook:", new Date().toISOString());

  try {
    // 1. Validate webhook event
    console.log("Validating webhook event...");
    const validation = await validateWebhookEvent(webhookEvent);

    if (!validation.valid) {
      console.error("Invalid webhook event:", validation.error);
      return {
        success: false,
        error: validation.error,
      };
    }

    // Only process DisputeOpened events
    if (webhookEvent.event !== "DisputeOpened") {
      console.log(`Ignoring event type: ${webhookEvent.event}`);
      return {
        success: true,
        message: "Event type not handled",
      };
    }

    const { requestId } = webhookEvent.args;
    const { contractAddress } = webhookEvent;

    console.log(
      `Processing dispute for request ${requestId} in contract ${contractAddress}`
    );

    // 2. Fetch request details from blockchain
    console.log("Fetching request details from blockchain...");
    const serviceRequest = await fetchRequestDetails(
      contractAddress,
      requestId
    );

    // Verify request is in escrowed state
    if (serviceRequest.status !== RequestStatus.Escrowed) {
      console.error(`Request ${requestId} is not in escrowed state`);
      return {
        success: false,
        error: "Request not in escrowed state",
      };
    }

    // 3. Fetch resource request data from Supabase using request ID
    console.log("Fetching resource request data from Supabase...");
    const resourceRequestData = await fetchResourceRequestData(requestId);

    if (!resourceRequestData) {
      console.error(
        `No resource request data found for request ID: ${requestId}`
      );
      return {
        success: false,
        error: "Resource request data not found",
      };
    }

    // 4. Fetch service metadata
    // console.log("Fetching service metadata...");
    // let serviceMetadata = null;
    // try {
    //   const metadataURI = await getServiceMetadataURI(contractAddress);
    //   if (metadataURI) {
    //     serviceMetadata = await fetchServiceMetadata(metadataURI);
    //     console.log("Service metadata fetched successfully");
    //   } else {
    //     console.log("No metadata URI found for service");
    //   }
    // } catch (error) {
    //   console.warn("Failed to fetch service metadata:", error);
    //   // Continue without metadata - not a critical error
    // }

    // 8. Execute on-chain resolution (optional - can be disabled for testing)
    let transactionHash: string | undefined;

    if (process.env.SKIP_BLOCKCHAIN_CALLS === "true") {
      console.log("Skipping blockchain call (TEST_MODE)");
      transactionHash = "0x" + "0".repeat(64); // Mock transaction hash
    } else {
      const randomNumber = Math.random() > 0.5 ? true : false;
      console.log("Executing on-chain dispute resolution...");
      transactionHash = await handleDispute(
        contractAddress,
        requestId,
        randomNumber
      );
      console.log(
        `Dispute resolved on-chain. Transaction hash: ${transactionHash}`
      );
    }

    // Return success response
    return {
      success: true,
      requestId,
      transactionHash,
    };
  } catch (error) {
    console.error("Error processing dispute:", error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    return {
      success: false,
      error: "Failed to process dispute",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
