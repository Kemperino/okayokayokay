#!/usr/bin/env node

/**
 * Script to test the dispute webhook endpoint
 * Usage: tsx scripts/test-dispute-webhook.ts
 */

const port = process.env.PORT || '3001';
const webhookUrl = `http://localhost:${port}/api/dispute-webhook`;

// Mock webhook event data
const mockWebhookEvent = {
  event: 'DisputeEscalated',
  contractAddress: '0x1234567890123456789012345678901234567890',
  transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  blockNumber: 123456,
  timestamp: Date.now(),
  args: {
    requestId: '0x1111111111111111111111111111111111111111111111111111111111111111'
  },
  network: 'base-sepolia'
};

async function testWebhook() {
  console.log('🧪 Testing Dispute Webhook Endpoint');
  console.log('================================');
  console.log(`URL: ${webhookUrl}`);
  console.log('');

  try {
    // First, test GET endpoint to check if it's running
    console.log('1️⃣ Testing GET endpoint...');
    const getResponse = await fetch(webhookUrl);
    const getResult = await getResponse.json();
    console.log('✅ GET Response:', getResult);
    console.log('');

    // Test POST with webhook event
    console.log('2️⃣ Testing POST with webhook event...');
    console.log('Event:', JSON.stringify(mockWebhookEvent, null, 2));

    const postResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': process.env.WEBHOOK_SECRET || 'test-webhook-secret-123'
      },
      body: JSON.stringify(mockWebhookEvent)
    });

    const postResult = await postResponse.json();

    console.log('');
    console.log('Response Status:', postResponse.status);
    console.log('Response Body:', JSON.stringify(postResult, null, 2));

    if (postResponse.ok && postResult.success) {
      console.log('');
      console.log('✅ Webhook processed successfully!');
      if (postResult.decision) {
        console.log(`   Decision: ${postResult.decision.refund ? 'REFUND' : 'NO REFUND'}`);
        console.log(`   Reason: ${postResult.decision.reason}`);
      }
      if (postResult.transactionHash) {
        console.log(`   Transaction: ${postResult.transactionHash}`);
      }
    } else {
      console.log('');
      console.log('❌ Webhook processing failed');
      console.log(`   Error: ${postResult.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
console.log('Starting test...');
console.log('Make sure the Next.js dev server is running (yarn dev)');
console.log('');

testWebhook().catch(console.error);