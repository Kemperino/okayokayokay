import { NextRequest, NextResponse } from 'next/server';
import { handleDisputeWebhook } from '@/lib/dispute_agent/webhook-handler';
import { validateAlchemySignature } from '@/lib/alchemy/signature';

export async function POST(request: NextRequest) {
  try {
    // Check if this is a test webhook or production Alchemy webhook
    const alchemySignature = request.headers.get('x-alchemy-signature');
    const testSignature = request.headers.get('x-webhook-signature');
    const bodyText = await request.text();
    let body: any;

    if (alchemySignature) {
      // Production mode - validate Alchemy signature
      const signingKey = process.env.ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY;
      if (!signingKey) {
        console.error('ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      if (!validateAlchemySignature(bodyText, alchemySignature, signingKey)) {
        console.error('Invalid Alchemy webhook signature for dispute-webhook');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      body = JSON.parse(bodyText);
    } else if (testSignature) {
      // Test mode - validate simple webhook secret
      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (webhookSecret && testSignature !== webhookSecret) {
        console.error('Invalid test webhook signature');
        return NextResponse.json({ error: 'Invalid test signature' }, { status: 401 });
      }
      console.log('Test mode: Processing with test webhook signature');
      body = JSON.parse(bodyText);
    } else {
      // No signature provided
      console.error('No webhook signature provided');
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    console.log('Dispute webhook received:', {
      webhookId: payload.webhookId,
      network: payload.event?.network,
      logsCount: payload.event?.data?.block?.logs?.length || 0
    });

    const result = await handleDisputeWebhook(payload);

    // Return the response
    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    });

  } catch (error) {
    console.error('Error processing dispute webhook:', error);

    return NextResponse.json(
      {
        error: 'Failed to process dispute',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Dispute webhook endpoint is running',
    method: 'Use POST to send webhook events',
    modes: {
      test: {
        enabled: !!process.env.WEBHOOK_SECRET,
        header: 'x-webhook-signature',
        configured: !!process.env.WEBHOOK_SECRET
      },
      production: {
        enabled: !!process.env.ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY,
        header: 'x-alchemy-signature',
        configured: !!process.env.ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY
      }
    },
    environment: {
      hasTestSecret: !!process.env.WEBHOOK_SECRET,
      hasAlchemySigningKey: !!process.env.ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasPrivateKey: !!process.env.AGENT_PRIVATE_KEY,
      hasRPC: !!process.env.BASE_RPC_URL
    }
  });
}
