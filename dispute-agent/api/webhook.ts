import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateWebhookEvent } from '../lib/validator';
import { fetchRequestDetails, getServiceMetadataURI } from '../lib/blockchain';
import { fetchAPIResponseData } from '../lib/supabase';
import { fetchServiceMetadata } from '../lib/metadata';
import { makeDisputeDecision } from '../lib/llm';
import { resolveDisputeOnChain } from '../lib/resolver';
import { WebhookEvent, DisputeContext, RequestStatus } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Dispute agent webhook received:', new Date().toISOString());

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Validate webhook event
    console.log('Validating webhook event...');
    const webhookEvent = req.body as WebhookEvent;

    // Verify webhook secret if configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-webhook-signature'];
      if (!signature || signature !== webhookSecret) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Validate event structure and parameters
    const validation = await validateWebhookEvent(webhookEvent);
    if (!validation.valid) {
      console.error('Invalid webhook event:', validation.error);
      return res.status(400).json({ error: validation.error });
    }

    // Only process DisputeEscalated events
    if (webhookEvent.event !== 'DisputeEscalated') {
      console.log(`Ignoring event type: ${webhookEvent.event}`);
      return res.status(200).json({ message: 'Event type not handled' });
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
      return res.status(400).json({ error: 'Request not in escalated state' });
    }

    // 3. Fetch API response data from Supabase
    console.log('Fetching API response data from Supabase...');
    const apiResponseData = await fetchAPIResponseData(serviceRequest.apiResponseHash);

    if (!apiResponseData) {
      console.error(`No API response data found for hash: ${serviceRequest.apiResponseHash}`);
      return res.status(404).json({ error: 'API response data not found' });
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

    // 8. Execute on-chain resolution
    console.log('Executing on-chain dispute resolution...');
    const txHash = await resolveDisputeOnChain(
      contractAddress,
      requestId,
      decision.refund
    );

    console.log(`Dispute resolved on-chain. Transaction hash: ${txHash}`);

    // 9. Log resolution to database (optional - for tracking)
    // You could store this in Supabase for audit trail
    const resolution = {
      requestId,
      contractAddress,
      decision,
      transactionHash: txHash,
      resolvedAt: new Date().toISOString(),
      agentAddress: process.env.AGENT_ADDRESS
    };

    // Return success response
    return res.status(200).json({
      success: true,
      requestId,
      decision: {
        refund: decision.refund,
        reason: decision.reason
      },
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Error processing dispute:', error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    return res.status(500).json({
      error: 'Failed to process dispute',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}