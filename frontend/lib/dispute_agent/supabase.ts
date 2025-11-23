import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResourceRequestData } from './types';

// Lazy initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

/**
 * Fetches resource request data from Supabase using the request ID
 * We now query by request_id directly instead of response_hash
 */
export async function fetchResourceRequestData(
  requestId: string
): Promise<ResourceRequestData | null> {
  try {
    console.log(`Fetching resource request data for request ID: ${requestId}`);

    // Query the resource_requests table
    const { data, error } = await getSupabaseClient()
      .from('resource_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return null;
    }

    if (!data) {
      console.log('No data found for request ID');
      return null;
    }

    // Transform the data to match our type
    const resourceRequestData: ResourceRequestData = {
      id: data.id,
      request_id: data.request_id,
      input_data: data.input_data,
      output_data: data.output_data,
      response_hash: data.response_hash,
      timestamp: data.timestamp,
      service_provider: data.service_provider,
      buyer_address: data.buyer_address,
      amount: data.amount
    };

    return resourceRequestData;
  } catch (error) {
    console.error('Error fetching resource request data:', error);
    throw new Error(`Failed to fetch resource request data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches dispute history for a request (if any previous disputes exist)
 */
export async function fetchDisputeHistory(
  requestId: string
): Promise<any[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('dispute_events')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching dispute history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching dispute history:', error);
    return [];
  }
}

/**
 * Fetches transaction details from Supabase
 */
export async function fetchTransactionDetails(
  requestId: string
): Promise<any | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('transactions')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      console.error('Error fetching transaction details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}
