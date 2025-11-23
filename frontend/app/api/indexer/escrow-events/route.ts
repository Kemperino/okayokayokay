/**
 * Webhook endpoint for Alchemy to send escrow contract events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAlchemySignature } from '@/lib/alchemy/signature';
import { ethers } from 'ethers';
import { DisputeEscrowABI } from '@/lib/contracts/DisputeEscrowABI';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Event signatures
const EVENT_SIGNATURES = {
  ESCROW_CONFIRMED: ethers.id('EscrowConfirmed(bytes32,bytes32)'),
  ESCROW_RELEASED: ethers.id('EscrowReleased(bytes32,uint256)'),
  DISPUTE_OPENED: ethers.id('DisputeOpened(bytes32,address)'),
  DISPUTE_RESPONDED: ethers.id('DisputeResponded(bytes32,bool)'),
  DISPUTE_ESCALATED: ethers.id('DisputeEscalated(bytes32)'),
  DISPUTE_RESOLVED: ethers.id('DisputeResolved(bytes32,bool,address)'),
  DISPUTE_CANCELLED: ethers.id('DisputeCancelled(bytes32)'),
};

interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  createdAt: string;
  type: 'ADDRESS_ACTIVITY' | 'GRAPHQL';
  event: {
    network: string;
    activity: Array<{
      blockNum: string;
      hash: string;
      fromAddress: string;
      toAddress: string;
      value: number;
      asset: string;
      category: string;
      log?: {
        address: string;
        topics: string[];
        data: string;
        blockNumber: string;
        transactionHash: string;
        transactionIndex: string;
        blockHash: string;
        logIndex: string;
        removed: boolean;
      };
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-alchemy-signature');
    const body = await request.text();

    const signingKey = process.env.ALCHEMY_ESCROW_EVENTS_SIGNING_KEY;
    if (!signingKey) {
      console.error('ALCHEMY_ESCROW_EVENTS_SIGNING_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!validateAlchemySignature(body, signature, signingKey)) {
      console.error('Invalid Alchemy webhook signature for escrow-events');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: AlchemyWebhookPayload = JSON.parse(body);

    // 2. Process each event
    for (const activity of payload.event.activity) {
      if (!activity.log) continue;

      const eventSignature = activity.log.topics[0];
      const escrowAddress = activity.log.address;

      // 3. Decode event based on signature
      let eventData: any = {};
      let eventType: string = '';

      switch (eventSignature) {
        case EVENT_SIGNATURES.ESCROW_CONFIRMED: {
          eventType = 'ESCROW_CONFIRMED';
          const iface = new ethers.Interface(DisputeEscrowABI);
          const decoded = iface.parseLog({
            topics: activity.log.topics,
            data: activity.log.data,
          });
          eventData = {
            requestId: decoded?.args[0],
            apiResponseHash: decoded?.args[1],
          };
          await handleEscrowConfirmed(escrowAddress, eventData);
          break;
        }

        case EVENT_SIGNATURES.DISPUTE_OPENED: {
          eventType = 'DISPUTE_OPENED';
          const iface = new ethers.Interface(DisputeEscrowABI);
          const decoded = iface.parseLog({
            topics: activity.log.topics,
            data: activity.log.data,
          });
          eventData = {
            requestId: decoded?.args[0],
            buyer: decoded?.args[1],
          };
          await handleDisputeOpened(escrowAddress, eventData);
          break;
        }

        case EVENT_SIGNATURES.DISPUTE_ESCALATED: {
          eventType = 'DISPUTE_ESCALATED';
          const iface = new ethers.Interface(DisputeEscrowABI);
          const decoded = iface.parseLog({
            topics: activity.log.topics,
            data: activity.log.data,
          });
          eventData = {
            requestId: decoded?.args[0],
          };
          await handleDisputeEscalated(escrowAddress, eventData);
          break;
        }

        case EVENT_SIGNATURES.DISPUTE_RESOLVED: {
          eventType = 'DISPUTE_RESOLVED';
          const iface = new ethers.Interface(DisputeEscrowABI);
          const decoded = iface.parseLog({
            topics: activity.log.topics,
            data: activity.log.data,
          });
          eventData = {
            requestId: decoded?.args[0],
            buyerRefunded: decoded?.args[1],
            disputeAgent: decoded?.args[2],
          };
          await handleDisputeResolved(escrowAddress, eventData);
          break;
        }

        default:
          console.log('Unknown event signature:', eventSignature);
          continue;
      }

      // 4. Store raw event in database
      await supabase.from('blockchain_events').insert({
        event_type: eventType,
        contract_address: escrowAddress,
        transaction_hash: activity.log.transactionHash,
        block_number: parseInt(activity.log.blockNumber),
        log_index: parseInt(activity.log.logIndex),
        event_data: eventData,
        raw_data: activity.log,
        created_at: new Date().toISOString(),
      });

      console.log(`Processed ${eventType} event from ${escrowAddress}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Event Handlers
async function handleEscrowConfirmed(
  escrowAddress: string,
  data: { requestId: string; apiResponseHash: string }
) {
  console.log(`Escrow confirmed for request ${data.requestId}`);

  // Update transaction status in database
  await supabase
    .from('transactions')
    .update({
      status: 'escrowed',
      escrow_confirmed_at: new Date().toISOString(),
      api_response_hash: data.apiResponseHash,
    })
    .eq('request_id', data.requestId);

  // Notify relevant parties (could trigger email, push notification, etc.)
  await notifyParties('escrow_confirmed', {
    escrowAddress,
    ...data,
  });
}

async function handleDisputeOpened(
  escrowAddress: string,
  data: { requestId: string; buyer: string }
) {
  console.log(`Dispute opened for request ${data.requestId} by ${data.buyer}`);

  // Create dispute record
  await supabase.from('disputes').insert({
    request_id: data.requestId,
    escrow_address: escrowAddress,
    buyer_address: data.buyer,
    status: 'dispute_opened',
    opened_at: new Date().toISOString(),
  });

  // Update transaction status
  await supabase
    .from('transactions')
    .update({ status: 'dispute_opened' })
    .eq('request_id', data.requestId);

  // Notify seller
  await notifyParties('dispute_opened', {
    escrowAddress,
    ...data,
  });
}

async function handleDisputeEscalated(
  escrowAddress: string,
  data: { requestId: string }
) {
  console.log(`Dispute escalated for request ${data.requestId}`);

  // Update dispute status
  await supabase
    .from('disputes')
    .update({
      status: 'dispute_escalated',
      escalated_at: new Date().toISOString(),
    })
    .eq('request_id', data.requestId);

  // Trigger dispute agent assignment
  await triggerDisputeAgentWebhook(data.requestId, escrowAddress);
}

async function handleDisputeResolved(
  escrowAddress: string,
  data: { requestId: string; buyerRefunded: boolean; disputeAgent: string }
) {
  console.log(
    `Dispute resolved for request ${data.requestId}. Buyer refunded: ${data.buyerRefunded}`
  );

  // Update dispute record
  await supabase
    .from('disputes')
    .update({
      status: 'dispute_resolved',
      resolved_at: new Date().toISOString(),
      buyer_refunded: data.buyerRefunded,
      resolved_by_agent: data.disputeAgent,
    })
    .eq('request_id', data.requestId);

  // Update transaction status
  await supabase
    .from('transactions')
    .update({
      status: 'dispute_resolved',
      final_outcome: data.buyerRefunded ? 'refunded' : 'seller_paid',
    })
    .eq('request_id', data.requestId);

  // Update agent statistics
  await updateAgentStats(data.disputeAgent, data.buyerRefunded);
}

async function notifyParties(eventType: string, data: any) {
  // Send notifications to relevant parties
  // This could integrate with email, SMS, push notifications, etc.
  console.log(`Notifying parties about ${eventType}:`, data);

  // Example: Call internal notification service
  if (process.env.NOTIFICATION_SERVICE_URL) {
    await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, data }),
    });
  }
}

async function triggerDisputeAgentWebhook(requestId: string, escrowAddress: string) {
  // Trigger the dispute agent system
  console.log(`Triggering dispute agent for request ${requestId}`);

  // Call the existing dispute agent webhook
  await fetch(`${process.env.APP_URL}/api/dispute-agent/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({
      requestId,
      escrowAddress,
      event: 'dispute_escalated',
    }),
  });
}

async function updateAgentStats(agentAddress: string, buyerWon: boolean) {
  // Update dispute agent statistics
  const { data: agent } = await supabase
    .from('dispute_agents')
    .select('total_disputes_resolved, disputes_buyer_won, disputes_seller_won')
    .eq('agent_address', agentAddress)
    .single();

  if (agent) {
    await supabase
      .from('dispute_agents')
      .update({
        total_disputes_resolved: agent.total_disputes_resolved + 1,
        disputes_buyer_won: buyerWon
          ? agent.disputes_buyer_won + 1
          : agent.disputes_buyer_won,
        disputes_seller_won: !buyerWon
          ? agent.disputes_seller_won + 1
          : agent.disputes_seller_won,
      })
      .eq('agent_address', agentAddress);
  }
}
