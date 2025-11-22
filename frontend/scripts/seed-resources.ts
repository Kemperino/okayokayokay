#!/usr/bin/env tsx
/**
 * Seed initial resources
 *
 * This script adds the WindyBay weather resource as a starter example
 *
 * Run: npx tsx scripts/seed-resources.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedResources() {
  console.log('🌱 Seeding resources...\n');

  const resources = [
    {
      name: 'WindyBay Weather',
      description: 'Get weather forecasts for any location and date',
      base_url: 'https://windybay.okay3.xyz',
      well_known_url: 'https://windybay.okay3.xyz/.well-known/x402',
    },
  ];

  for (const resource of resources) {
    console.log(`Adding resource: ${resource.name}`);

    // Fetch .well-known/x402 data
    let wellKnownData = null;
    let paymentAddress = null;
    let pricePerRequest = null;

    try {
      const response = await fetch(resource.well_known_url);
      if (response.ok) {
        wellKnownData = await response.json();
        console.log('  ✓ Fetched .well-known/x402 data');

        if (wellKnownData.payment) {
          paymentAddress = wellKnownData.payment.address;
          pricePerRequest = wellKnownData.payment.pricePerRequest;
          console.log(`  ✓ Payment address: ${paymentAddress}`);
          console.log(`  ✓ Price: ${pricePerRequest} USDC`);
        }
      }
    } catch (error) {
      console.warn(`  ⚠ Could not fetch .well-known/x402:`, error);
    }

    // Check if resource already exists
    const { data: existing } = await supabase
      .from('resources')
      .select('id')
      .eq('base_url', resource.base_url)
      .single();

    if (existing) {
      console.log('  ⏭ Resource already exists, skipping\n');
      continue;
    }

    // Insert resource
    const { error } = await supabase.from('resources').insert({
      name: resource.name,
      description: resource.description,
      base_url: resource.base_url,
      well_known_url: resource.well_known_url,
      well_known_data: wellKnownData,
      payment_address: paymentAddress,
      price_per_request: pricePerRequest,
      is_active: true,
    });

    if (error) {
      console.error(`  ❌ Error adding resource:`, error);
    } else {
      console.log('  ✅ Resource added successfully\n');
    }
  }

  console.log('✨ Done!');
}

seedResources();
