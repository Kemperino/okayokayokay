import { validateWebhookEvent } from './validator';
import { fetchRequestDetails, getServiceMetadataURI } from './blockchain';
import { fetchResourceRequestData } from './supabase';
import { fetchServiceMetadata } from './metadata';
import { makeDisputeDecision } from './llm';
import { resolveDisputeOnChain } from './resolver';
import { WebhookEvent, DisputeContext, RequestStatus } from './types';
import { ethers } from 'ethers';
import { DisputeEscrowABI } from '@/lib/contracts/DisputeEscrowABI';
import dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/../../.env' });

const DISPUTE_ESCALATED_SIGNATURE = ethers.id('DisputeEscalated(bytes32)');

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
export async function handleDisputeWebhook(payload: WebhookEvent): Promise<WebhookResult> {
  console.log('Processing dispute webhook:', new Date().toISOString());

  try {
    const validation = await validateWebhookEvent(payload);

    if (!validation.valid) {
      console.error('Invalid webhook event:', validation.error);
      return {
        success: false,
        error: validation.error
      };
    }

    for (const log of payload.event.data.block.logs) {
      const eventSignature = log.topics[0];
      
      if (eventSignature !== DISPUTE_ESCALATED_SIGNATURE) {
        console.log('Ignoring non-DisputeEscalated event');
        continue;
      }

      const contractAddress = log.account.address;
      
      const iface = new ethers.Interface(DisputeEscrowABI);
      const decoded = iface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!decoded) {
        console.error('Failed to decode event');
        continue;
      }

      const requestId = decoded.args[0];
      console.log(`Processing dispute for request ${requestId} in contract ${contractAddress}`);

      console.log('Checking on-chain state for idempotency...');
      const serviceRequest = await fetchRequestDetails(contractAddress, requestId);

      if (serviceRequest.status === RequestStatus.DisputeResolved) {
        console.log(`Dispute ${requestId} already resolved on-chain. Returning success (idempotent).`);
        return {
          success: true,
          requestId,
          message: 'Dispute already resolved on-chain (duplicate webhook call)'
        };
      }

      if (serviceRequest.status !== RequestStatus.DisputeEscalated) {
        console.log(`Request ${requestId} not in escalated state (status: ${serviceRequest.status}). Skipping.`);
        return {
          success: true,
          requestId,
          message: `Request not in escalated state (status: ${serviceRequest.status})`
        };
      }

      console.log(`Request ${requestId} confirmed in DisputeEscalated state. Processing...`)

      console.log('Fetching resource request data from Supabase...');
      const resourceRequestData = await fetchResourceRequestData(requestId);

      if (!resourceRequestData) {
        console.error(`No resource request data found for request ID: ${requestId}`);
        return {
          success: false,
          error: 'Resource request data not found'
        };
      }

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
      }

      const disputeContext: DisputeContext = {
        requestId,
        contractAddress,
        serviceRequest,
        resourceRequestData,
        serviceMetadata
      };

      console.log('Making dispute decision with LLM...');
      const decision = await makeDisputeDecision(disputeContext);

      console.log(`LLM Decision: Refund=${decision.refund}, Reason="${decision.reason}"`);

      const confidenceThreshold = parseFloat(process.env.RESOLUTION_CONFIDENCE_THRESHOLD || '0.8');
      if (decision.confidence && decision.confidence < confidenceThreshold) {
        console.warn(`Confidence ${decision.confidence} below threshold ${confidenceThreshold}`);
      }

      let transactionHash: string | undefined;

      if (process.env.SKIP_BLOCKCHAIN_CALLS === 'true') {
        console.log('Skipping blockchain call (TEST_MODE)');
        transactionHash = '0x' + '0'.repeat(64);
      } else {
        console.log('Sending on-chain dispute resolution transaction...');
        transactionHash = await resolveDisputeOnChain(
          contractAddress,
          requestId,
          decision.refund
        );
        console.log(`Transaction submitted: ${transactionHash} (not waiting for confirmation)`);
      }

      return {
        success: true,
        requestId,
        decision: {
          refund: decision.refund,
          reason: decision.reason
        },
        transactionHash
      };
    }

    return {
      success: true,
      message: 'No DisputeEscalated events found in payload'
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
