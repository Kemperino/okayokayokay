import { NextRequest, NextResponse } from 'next/server';
import { handleDisputeWebhook } from '@/lib/dispute_agent/webhook-handler';
import { validateAlchemySignature } from '@/lib/alchemy/signature';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-alchemy-signature');
    const bodyText = await request.text();

    const signingKey = process.env.ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.error('ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!validateAlchemySignature(bodyText, signature, signingKey)) {
      console.error('Invalid Alchemy webhook signature for dispute-webhook');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);

    console.log('Dispute webhook received:', {
      event: body.event,
      contractAddress: body.contractAddress,
      requestId: body.args?.requestId
    });

    // Call the dispute agent handler
    const result = await handleDisputeWebhook(body);

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
    testMode: true,
    environment: {
      hasAlchemySigningKey: !!process.env.ALCHEMY_DISPUTE_WEBHOOK_SIGNING_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasPrivateKey: !!process.env.AGENT_PRIVATE_KEY,
      hasRPC: !!process.env.BASE_RPC_URL
    }
  });
}
