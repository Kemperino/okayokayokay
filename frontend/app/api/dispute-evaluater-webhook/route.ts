import { NextRequest, NextResponse } from "next/server";
import { merchantHandlingDisputes } from "@/lib/merchant/merchant-handling-disputes";

export async function POST(request: NextRequest) {
  try {
    // Get the webhook signature from headers
    const signature = request.headers.get("x-webhook-signature");

    // Validate the webhook signature if configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();

    console.log("Dispute webhook received:", {
      event: body.event,
      contractAddress: body.contractAddress,
      requestId: body.args?.requestId,
    });

    // Call the dispute agent handler
    const result = await merchantHandlingDisputes(body);

    // Return the response
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Error processing dispute webhook:", error);

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
    status: "ok",
    message: "Dispute webhook endpoint is running",
    method: "Use POST to send webhook events",
    testMode: true,
    environment: {
      hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasPrivateKey: !!process.env.AGENT_PRIVATE_KEY,
    },
  });
}
