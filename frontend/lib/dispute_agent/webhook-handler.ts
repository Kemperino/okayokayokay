import { validateWebhookEvent } from './validator';
import { fetchRequestDetails, getServiceMetadataURI } from './blockchain';
import { fetchAPIResponseData } from './supabase';
import { fetchServiceMetadata } from './metadata';
import { makeDisputeDecision } from './llm';
import { resolveDisputeOnChain } from './resolver';
import { WebhookEvent, DisputeContext, RequestStatus } from './types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: __dirname + '/../../.env' });

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
export async function handleDisputeWebhook(webhookEvent: WebhookEvent): Promise<WebhookResult> {
  console.log('Processing dispute webhook:', new Date().toISOString());

  try {
    // 1. Validate webhook event
    console.log('Validating webhook event...');
    const validation = await validateWebhookEvent(webhookEvent);

    if (!validation.valid) {
      console.error('Invalid webhook event:', validation.error);
      return {
        success: false,
        error: validation.error
      };
    }

    // Only process DisputeEscalated events
    if (webhookEvent.event !== 'DisputeEscalated') {
      console.log(`Ignoring event type: ${webhookEvent.event}`);
      return {
        success: true,
        message: 'Event type not handled'
      };
    }

    const { requestId } = webhookEvent.args;
    const { contractAddress } = webhookEvent;

    console.log(`Processing dispute for request ${requestId} in contract ${contractAddress}`);

    // 2. Fetch request details from blockchain
    console.log('Fetching request details from blockchain...');
    const serviceRequest = await fetchRequestDetails(contractAddress, requestId);

    // Verify request is in escalated state
    if (serviceRequest.status !== RequestStatus.DisputeEscalated) {
      console.error(`Request ${requestId} is not in escalated state`);
      return {
        success: false,
        error: 'Request not in escalated state'
      };
    }

    // 3. Fetch API response data from Supabase
    console.log('Fetching API response data from Supabase...');
    const apiResponseData = await fetchAPIResponseData(serviceRequest.apiResponseHash);

    if (!apiResponseData) {
      console.error(`No API response data found for hash: ${serviceRequest.apiResponseHash}`);
      return {
        success: false,
        error: 'API response data not found'
      };
    }

    // 4. Fetch service metadata
    console.log('Fetching service metadata...');
    let serviceMetadata = null;
    try {
      const metadataURI = await getServiceMetadataURI(contractAddress);
      if (metadataURI) {
        serviceMetadata = await fetchServiceMetadata(metadataURI);
        console.log('Service metadata fetched successfully');
      } else {
        console.log('No metadata URI found for service');
      }
    } catch (error) {
      console.warn('Failed to fetch service metadata:', error);
      // Continue without metadata - not a critical error
    }

    // 5. Prepare dispute context
    const disputeContext: DisputeContext = {
      requestId,
      contractAddress,
      serviceRequest,
      apiResponseData,
      serviceMetadata
    };

    // 6. Make LLM decision
    console.log('Making dispute decision with LLM...');
    const decision = await makeDisputeDecision(disputeContext);

    console.log(`LLM Decision: Refund=${decision.refund}, Reason="${decision.reason}"`);

    // 7. Check confidence threshold if configured
    const confidenceThreshold = parseFloat(process.env.RESOLUTION_CONFIDENCE_THRESHOLD || '0.8');
    if (decision.confidence && decision.confidence < confidenceThreshold) {
      console.warn(`Confidence ${decision.confidence} below threshold ${confidenceThreshold}`);
      // In production, you might want to escalate to human review here
      // For now, we'll proceed but log the low confidence
    }

    // 8. Execute on-chain resolution (optional - can be disabled for testing)
    let transactionHash: string | undefined;

    if (process.env.SKIP_BLOCKCHAIN_CALLS === 'true') {
      console.log('Skipping blockchain call (TEST_MODE)');
      transactionHash = '0x' + '0'.repeat(64); // Mock transaction hash
    } else {
      console.log('Executing on-chain dispute resolution...');
      transactionHash = await resolveDisputeOnChain(
        contractAddress,
        requestId,
        decision.refund
      );
      console.log(`Dispute resolved on-chain. Transaction hash: ${transactionHash}`);
    }

    // Return success response
    return {
      success: true,
      requestId,
      decision: {
        refund: decision.refund,
        reason: decision.reason
      },
      transactionHash
    };

  } catch (error) {
    console.error('Error processing dispute:', error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    return {
      success: false,
      error: 'Failed to process dispute',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}