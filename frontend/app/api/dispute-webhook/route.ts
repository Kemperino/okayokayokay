import { NextRequest, NextResponse } from 'next/server';
import { handleDisputeWebhook } from '@/lib/dispute_agent/webhook-handler';
import { validateAlchemySignature } from '@/lib/alchemy/signature';

export async function POST(request: NextRequest) {
  try {
    const alchemySignature = request.headers.get('x-alchemy-signature');
    const testSignature = request.headers.get('x-webhook-signature');
    const bodyText = await request.text();
    
    console.log('Dispute webhook - Incoming request:', {
      timestamp: new Date().toISOString(),
      hasAlchemySignature: !!alchemySignature,
      hasTestSignature: !!testSignature,
      contentLength: bodyText.length,
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
      }
    });

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Failed to parse webhook body as JSON:', parseError);
      body = { rawBody: bodyText };
    }

    console.log('Dispute webhook - Parsed payload:', {
      webhookId: body.webhookId,
      network: body.event?.network,
      eventType: body.type,
      logsCount: body.event?.data?.block?.logs?.length || 0,
      hasEvent: !!body.event,
      eventKeys: body.event ? Object.keys(body.event) : []
    });

    // TEMPORARILY DISABLED: Signature verification
    console.log('[TEMP] Signature verification DISABLED for dispute-webhook');
    if (alchemySignature) {
      console.log('Alchemy signature present (not validated)');
    } else if (testSignature) {
      console.log('Test signature present (not validated)');
    } else {
      console.log('No signature present');
    }

    console.log('Calling handleDisputeWebhook with payload');
    const result = await handleDisputeWebhook(body);

    console.log('Dispute webhook - Processing result:', {
      success: result.success,
      hasMessage: !!result.message,
      isDuplicate: result.message?.includes('already resolved'),
      resultKeys: Object.keys(result)
    });

    if (result.message?.includes('already resolved')) {
      console.log('Returning 200 for duplicate webhook (idempotent response)');
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    });

  } catch (error) {
    console.error('Error processing dispute webhook:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      timestamp: new Date().toISOString()
    });

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
