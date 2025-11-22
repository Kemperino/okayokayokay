import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '[REDACTED]' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addWindyBayResource() {
  console.log('Adding WindyBay weather resource...');

  const windyBayResource = {
    name: 'WindyBay Weather',
    description: 'Weather information service powered by x402',
    base_url: 'https://windybay.okay3.xyz',
    well_known_url: 'https://windybay.okay3.xyz/.well-known/x402',
    payment_address: null, // Will be fetched from .well-known
    price_per_request: 0.01, // Example price
    is_active: true,
  };

  const { data, error } = await supabase
    .from('resources')
    .insert(windyBayResource)
    .select()
    .single();

  if (error) {
    console.error('Error adding WindyBay resource:', error);
    process.exit(1);
  }

  console.log('Successfully added WindyBay resource:', data);
  console.log('\nResource details:');
  console.log(`- ID: ${data.id}`);
  console.log(`- Name: ${data.name}`);
  console.log(`- Base URL: ${data.base_url}`);
  console.log(`- Example endpoint: ${data.base_url}/weather?location=New%20York&date=2025-01-15`);

  process.exit(0);
}

addWindyBayResource();
