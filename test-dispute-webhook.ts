/**
 * Test script to simulate Alchemy calling the dispute-evaluater-webhook endpoint
 *
 * Usage:
 *   npx ts-node test-dispute-webhook.ts
 *
 * Make sure your frontend dev server is running on localhost:3000
 */

import crypto from "crypto";

// Hardcoded test values
const CONTRACT_ADDRESS = "0xE8f8231645061Fb9Cce742fe58418C592B7331aa";
const REQUEST_ID =
  "0xa01cb592e5ca5008f6a845fec744ce19d45a60e75d7be67076d0d0d63b4ce06d";
const WEBHOOK_URL = "http://localhost:3000/api/dispute-evaluater-webhook";

// Optional: webhook secret (set in WEBHOOK_SECRET env var on the server)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/**
 * Creates the webhook payload that Alchemy would send
 */
function createDisputeEscalatedPayload() {
  return {
    event: "DisputeOpened",
    contractAddress: CONTRACT_ADDRESS,
    transactionHash: "0x" + "a".repeat(64),
    blockNumber: 12345678,
    network: "base",
    args: {
      requestId: REQUEST_ID,
      escalatedBy: "0x" + "b".repeat(40),
    },
  };
}

/**
 * Creates a webhook signature (HMAC-SHA256)
 * This matches what Alchemy would send
 */
function createWebhookSignature(payload: any, secret: string): string {
  if (!secret) return "";

  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");
}

/**
 * Main function to test the webhook
 */
async function testWebhook() {
  console.log("\n🚀 Testing Dispute Evaluater Webhook\n");
  console.log(`📍 Endpoint: ${WEBHOOK_URL}`);
  console.log(`📋 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`📋 Request ID: ${REQUEST_ID}`);
  console.log(`🔐 Webhook Secret Configured: ${!!WEBHOOK_SECRET}\n`);

  try {
    // Create payload
    const payload = createDisputeEscalatedPayload();

    console.log("📤 Sending payload:");
    console.log(JSON.stringify(payload, null, 2));

    // Create headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = createWebhookSignature(payload, WEBHOOK_SECRET);
      headers["x-webhook-signature"] = signature;
      console.log(`\n🔐 Signature: ${signature}`);
    } else {
      console.log(
        "\n⚠️  No WEBHOOK_SECRET set - signature validation will be skipped"
      );
    }

    // Send request
    console.log("\n⏳ Sending POST request...\n");
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // Parse response
    const responseData = await response.json();

    // Display results
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Body:`);
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log("\n✅ Webhook test successful!");
      if (responseData.success) {
        console.log(
          `   Decision: ${
            responseData.decision?.refund ? "REFUND BUYER" : "ACCEPT MERCHANT"
          }`
        );
        console.log(`   Reason: ${responseData.decision?.reason}`);
        console.log(`   Transaction: ${responseData.transactionHash}`);
      }
    } else {
      console.log("\n❌ Webhook test failed!");
      console.log(`   Error: ${responseData.error}`);
      console.log(`   Message: ${responseData.message}`);
    }
  } catch (error) {
    console.error("\n❌ Error sending webhook:", error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
  }
}

/**
 * Test GET endpoint for health check
 */
async function testHealthCheck() {
  console.log("\n🏥 Testing Health Check (GET)\n");

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "GET",
    });

    const data = await response.json();

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Body:`);
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✅ Health check passed!");
      console.log(
        `   Environment ready: ${
          data.environment.hasWebhookSecret &&
          data.environment.hasOpenAI &&
          data.environment.hasSupabase &&
          data.environment.hasPrivateKey
            ? "✓"
            : "⚠️ Missing some env vars"
        }`
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  // First check if server is running
  console.log("🔍 Checking if server is running...");
  try {
    const response = await fetch("http://localhost:3000/api/health", {
      method: "GET",
    }).catch(() => null);

    if (!response) {
      console.log("⚠️  Frontend server not responding at localhost:3000");
      console.log("   Make sure to run: cd frontend && yarn dev\n");
    }
  } catch (e) {
    // Ignore
  }

  // Test health check
  await testHealthCheck();

  // Test webhook
  await testWebhook();

  console.log("\n✨ Test complete!\n");
}

// Run tests
runAllTests().catch(console.error);
