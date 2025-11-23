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
import { ethers } from "ethers";
import { DisputeEscrowABI } from "@/lib/contracts/DisputeEscrowABI";
import dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../../.env" });

const DISPUTE_OPENED_SIGNATURE = ethers.id("DisputeOpened(bytes32,address)");

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
  payload: WebhookEvent
): Promise<WebhookResult> {
  console.log("Processing merchant dispute webhook:", new Date().toISOString());

  try {
    const validation = await validateWebhookEvent(payload);

    if (!validation.valid) {
      console.error("Invalid webhook event:", validation.error);
      return {
        success: false,
        error: validation.error,
      };
    }

    for (const activity of payload.event.activity) {
      if (!activity.log) {
        continue;
      }

      const eventSignature = activity.log.topics[0];

      if (eventSignature !== DISPUTE_OPENED_SIGNATURE) {
        console.log("Ignoring non-DisputeOpened event");
        continue;
      }

      const contractAddress = activity.log.address;

      const iface = new ethers.Interface(DisputeEscrowABI);
      const decoded = iface.parseLog({
        topics: activity.log.topics,
        data: activity.log.data,
      });

      if (!decoded) {
        console.error("Failed to decode event");
        continue;
      }

      const requestId = decoded.args[0];
      console.log(
        `Processing dispute for request ${requestId} in contract ${contractAddress}`
      );

      console.log("Fetching request details from blockchain...");
      const serviceRequest = await fetchRequestDetails(
        contractAddress,
        requestId
      );

      if (serviceRequest.status !== RequestStatus.Escrowed) {
        console.error(`Request ${requestId} is not in escrowed state`);
        return {
          success: false,
          error: "Request not in escrowed state",
        };
      }

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

      let transactionHash: string | undefined;

      if (process.env.SKIP_BLOCKCHAIN_CALLS === "true") {
        console.log("Skipping blockchain call (TEST_MODE)");
        transactionHash = "0x" + "0".repeat(64);
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

      return {
        success: true,
        requestId,
        transactionHash,
      };
    }

    return {
      success: true,
      message: "No DisputeOpened events found in payload",
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
