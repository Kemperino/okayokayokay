import { NextRequest, NextResponse } from "next/server";
import { merchantHandlingDisputes } from "@/lib/merchant/merchant-handling-disputes";
import { validateAlchemySignature } from '@/lib/alchemy/signature';

export async function POST(request: NextRequest) {
  try {
    const alchemySignature = request.headers.get('x-alchemy-signature');
    const testSignature = request.headers.get('x-webhook-signature');
    const bodyText = await request.text();
    
    console.log('Dispute evaluator webhook - Incoming request:', {
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

    console.log('Dispute evaluator webhook - Parsed payload:', {
      webhookId: body.webhookId,
      network: body.event?.network,
      eventType: body.type,
      logsCount: body.event?.data?.block?.logs?.length || 0,
      hasEvent: !!body.event,
      eventKeys: body.event ? Object.keys(body.event) : [],
      fullPayload: JSON.stringify(body, null, 2)
    });

    // TEMPORARILY DISABLED: Signature verification
    console.log('[TEMP] Signature verification DISABLED for dispute-evaluator-webhook');
    if (alchemySignature) {
      console.log('Alchemy signature present (not validated)');
    } else if (testSignature) {
      console.log('Test signature present (not validated)');
    } else {
      console.log('No signature present');
    }

    console.log('Calling merchantHandlingDisputes with payload');
    const result = await merchantHandlingDisputes(body);

    console.log('Dispute evaluator webhook - Processing result:', {
      success: result.success,
      hasMessage: !!result.message,
      resultKeys: Object.keys(result)
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Error processing dispute evaluator webhook:", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        error: "Failed to process dispute",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Dispute evaluator webhook endpoint is running',
    method: 'Use POST to send webhook events',
    modes: {
      test: {
        enabled: !!process.env.WEBHOOK_SECRET,
        header: 'x-webhook-signature',
        configured: !!process.env.WEBHOOK_SECRET
      },
      production: {
        enabled: !!process.env.ALCHEMY_EVALUATOR_WEBHOOK_SIGNING_KEY,
        header: 'x-alchemy-signature',
        configured: !!process.env.ALCHEMY_EVALUATOR_WEBHOOK_SIGNING_KEY
      }
    },
    environment: {
      hasTestSecret: !!process.env.WEBHOOK_SECRET,
      hasAlchemySigningKey: !!process.env.ALCHEMY_EVALUATOR_WEBHOOK_SIGNING_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasPrivateKey: !!process.env.AGENT_PRIVATE_KEY,
      hasRPC: !!process.env.BASE_RPC_URL
    }
  });
}
