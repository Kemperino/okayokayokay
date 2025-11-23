#!/usr/bin/env tsx

/**
 * Generate Alchemy GraphQL webhook query for confirmEscrow
 *
 * Usage:
 *   tsx scripts/generate-webhook-query.ts 0xAddress1 0xAddress2 0xAddress3
 *   yarn generate-webhook 0xAddress1 0xAddress2 0xAddress3
 */

import { generateAlchemyGraphQLQuery, padAddressForTopics } from '../lib/alchemy/webhook-helpers';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    console.log('Usage:');
    console.log('  tsx scripts/generate-webhook-query.ts 0xAddress1 0xAddress2 0xAddress3');
    console.log('  yarn generate-webhook 0xAddress1 0xAddress2 0xAddress3');
    console.log('');
    console.log('Generates Alchemy GraphQL webhook query for monitoring USDC transfers');
    console.log('to specified addresses via transferWithAuth.');
    console.log('');
    console.log('Example:');
    console.log('  yarn generate-webhook 0x1234... 0x5678... 0xabcd...');
    process.exit(0);
  }

  const addresses = args;

  // Validate addresses
  for (const addr of addresses) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      console.error(`Error: Invalid Ethereum address: ${addr}`);
      console.error('Expected format: 0x followed by 40 hexadecimal characters');
      process.exit(1);
    }
  }

  console.log('='.repeat(80));
  console.log('Alchemy GraphQL Webhook Query Generator');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Monitoring ${addresses.length} address(es):`);
  addresses.forEach((addr, i) => {
    console.log(`  ${i + 1}. ${addr}`);
    console.log(`     Padded: ${padAddressForTopics(addr)}`);
  });
  console.log('');
  console.log('='.repeat(80));
  console.log('GraphQL Query (copy this into Alchemy webhook):');
  console.log('='.repeat(80));
  console.log('');

  const query = generateAlchemyGraphQLQuery(addresses);
  console.log(query);

  console.log('');
  console.log('='.repeat(80));
  console.log('Next Steps:');
  console.log('='.repeat(80));
  console.log('1. Go to Alchemy Dashboard → Notify → Custom Webhooks');
  console.log('2. Create a new GraphQL webhook');
  console.log('3. Paste the query above');
  console.log('4. Set webhook URL to: https://your-app.vercel.app/api/confirm-escrow');
  console.log('   (For local testing: use ngrok or similar)');
  console.log('5. Save and test!');
  console.log('');
}

main();
