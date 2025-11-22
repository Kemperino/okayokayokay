/**
 * Backfill seller_description for existing resource_requests
 *
 * This script fetches .well-known/x402 data for all resource requests
 * that have an empty seller_description field and populates them.
 *
 * Usage:
 *   npx tsx scripts/backfill-seller-descriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { fetchWellKnown } from '../lib/x402/well-known-fetcher';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ResourceRequest {
  request_id: string;
  user_address: string;
  resource_url: string | null;
  seller_description: any | null;
}

async function backfillSellerDescriptions() {
  console.log('Starting backfill of seller_description fields...\n');

  // Fetch all resource requests with empty seller_description
  const { data: requests, error } = await supabase
    .from('resource_requests')
    .select('request_id, user_address, resource_url, seller_description')
    .is('seller_description', null)
    .not('resource_url', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching resource requests:', error);
    process.exit(1);
  }

  if (!requests || requests.length === 0) {
    console.log('No resource requests found with empty seller_description.');
    console.log('All done!');
    return;
  }

  console.log(`Found ${requests.length} resource requests to backfill.\n`);

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  // Process each request
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i] as ResourceRequest;
    console.log(
      `[${i + 1}/${requests.length}] Processing request_id: ${request.request_id.substring(0, 12)}...`
    );

    if (!request.resource_url) {
      console.log('  ⚠️  Skipped: No resource_url');
      skippedCount++;
      continue;
    }

    try {
      // Fetch .well-known/x402 data (uses cache)
      const wellKnownData = await fetchWellKnown(request.resource_url);

      if (!wellKnownData) {
        console.log('  ❌ Failed: Could not fetch .well-known/x402');
        failureCount++;
        continue;
      }

      // Update the database
      const { error: updateError } = await supabase
        .from('resource_requests')
        .update({ seller_description: wellKnownData })
        .eq('request_id', request.request_id)
        .eq('user_address', request.user_address);

      if (updateError) {
        console.log('  ❌ Database update failed:', updateError.message);
        failureCount++;
        continue;
      }

      console.log('  ✅ Successfully updated');
      successCount++;

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.log('  ❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      failureCount++;
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed:  ${failureCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`📊 Total:   ${requests.length}`);
}

// Run the script
backfillSellerDescriptions()
  .then(() => {
    console.log('\nBackfill script finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nBackfill script crashed:', err);
    process.exit(1);
  });
