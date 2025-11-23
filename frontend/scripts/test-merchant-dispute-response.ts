#!/usr/bin/env npx tsx

/**
 * Test script for merchant dispute response webhook
 * Tests the merchant's response to a DisputeOpened event
 *
 * Usage: npx tsx scripts/test-merchant-dispute-response.ts <contractAddress> <requestId>
 * Example: npx tsx scripts/test-merchant-dispute-response.ts 0x123... 0xabc...
 *
 * Environment variables:
 * - WEBHOOK_HOST: Host for the webhook (default: localhost)
 * - WEBHOOK_PORT: Port for the webhook (default: 3000)
 * - WEBHOOK_SECRET: Secret for webhook authentication (default: test-webhook-secret-123)
 * - SKIP_BLOCKCHAIN_CALLS: Skip actual blockchain calls (default: true)
 */

import http from 'http';
import https from 'https';

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Missing required arguments\n');
  console.error('Usage: npx tsx scripts/test-merchant-dispute-response.ts <contractAddress> <requestId>');
  console.error('\nExample with mock addresses:');
  console.error('  npx tsx scripts/test-merchant-dispute-response.ts \\');
  console.error('    0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \\');
  console.error('    0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  process.exit(1);
}

const contractAddress = args[0];
const requestId = args[1];

// Validate inputs
if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
  console.error('❌ Invalid contract address format');
  console.error('Expected: 0x followed by 40 hex characters');
  console.error('Got:', contractAddress);
  process.exit(1);
}

if (!requestId.match(/^0x[a-fA-F0-9]{64}$/)) {
  console.error('❌ Invalid request ID format');
  console.error('Expected: 0x followed by 64 hex characters');
  console.error('Got:', requestId);
  process.exit(1);
}

// Configuration
const config = {
  host: process.env.WEBHOOK_HOST || 'localhost',
  port: parseInt(process.env.WEBHOOK_PORT || '3000'),
  path: '/api/dispute-evaluator-webhook',
  webhookSecret: process.env.WEBHOOK_SECRET || 'test-webhook-secret-123',
  skipBlockchain: process.env.SKIP_BLOCKCHAIN_CALLS || 'true'
};

// Create test webhook event (simulating DisputeOpened event from blockchain)
const webhookEvent = {
  event: 'DisputeOpened',
  contractAddress: contractAddress,
  transactionHash: '0x' + '0'.repeat(64), // Mock transaction hash for testing
  blockNumber: 12345678,
  network: 'base-sepolia',
  args: {
    requestId: requestId,
    buyer: '0x' + '1'.repeat(40), // Mock buyer address
    amount: '1000000' // 1 USDC (6 decimals)
  }
};

console.log('🚀 Testing Merchant Dispute Response Webhook\n');
console.log('Configuration:');
console.log(`  Endpoint: http://${config.host}:${config.port}${config.path}`);
console.log(`  Skip blockchain: ${config.skipBlockchain}`);
console.log('\nTest Event Data:');
console.log(`  Contract: ${contractAddress}`);
console.log(`  Request ID: ${requestId}`);
console.log(`  Event Type: ${webhookEvent.event}`);
console.log('\n' + '='.repeat(60) + '\n');

// Prepare request data
const data = JSON.stringify(webhookEvent);

// Request options
const options: http.RequestOptions = {
  hostname: config.host,
  port: config.port,
  path: config.path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-webhook-signature': config.webhookSecret
  }
};

// Make the request
const protocol = config.port === 443 ? https : http;

const req = protocol.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response Received:\n');
    console.log(`Status Code: ${res.statusCode}`);

    try {
      const jsonResponse = JSON.parse(responseData);

      if (res.statusCode !== 200) {
        console.error('\n❌ Request failed with status:', res.statusCode);
        console.error('Error:', jsonResponse);
        process.exit(1);
      }

      console.log('\n📋 Response Details:');
      console.log(JSON.stringify(jsonResponse, null, 2));

      // Display merchant's decision
      if (jsonResponse.decision) {
        console.log('\n' + '='.repeat(60));
        console.log('\n🎲 MERCHANT DECISION:');

        const accepted = jsonResponse.decision.acceptRefund;
        console.log(`\n  ${accepted ? '✅' : '❌'} Refund ${accepted ? 'ACCEPTED' : 'REJECTED'}`);
        console.log(`\n  📝 Reason: ${jsonResponse.decision.reason}`);

        if (jsonResponse.transactionHash) {
          console.log(`\n  🔗 Transaction: ${jsonResponse.transactionHash}`);
        }

        if (!accepted) {
          console.log('\n  ⚠️  Note: Since the merchant rejected, this would normally escalate to dispute agent arbitration');
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('\n✅ Test completed successfully!\n');

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Failed to parse response:', responseData);
      console.error('Parse error:', error);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error);
  console.error('\n💡 Make sure your Next.js server is running:');
  console.error('   cd frontend && yarn dev\n');
  process.exit(1);
});

// Set timeout
req.setTimeout(10000, () => {
  console.error('\n❌ Request timed out after 10 seconds');
  req.destroy();
  process.exit(1);
});

// Send the request
console.log('📤 Sending test webhook event...\n');
req.write(data);
req.end();