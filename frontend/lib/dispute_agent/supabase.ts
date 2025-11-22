import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APIResponseData } from './types';

// Lazy initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

/**
 * Fetches API response data from Supabase using the response hash
 */
export async function fetchAPIResponseData(
  apiResponseHash: string
): Promise<APIResponseData | null> {
  try {
    console.log(`Fetching API response data for hash: ${apiResponseHash}`);

    // Query the api_responses table
    const { data, error } = await getSupabaseClient()
      .from('api_responses')
      .select('*')
      .eq('response_hash', apiResponseHash)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return null;
    }

    if (!data) {
      console.log('No data found for response hash');
      return null;
    }

    // Transform the data to match our type
    const apiResponseData: APIResponseData = {
      id: data.id,
      request_id: data.request_id,
      response_hash: data.response_hash,
      request_data: data.request_data,
      response_data: data.response_data,
      timestamp: data.timestamp,
      service_provider: data.service_provider,
      buyer_address: data.buyer_address,
      amount: data.amount
    };

    return apiResponseData;
  } catch (error) {
    console.error('Error fetching API response data:', error);
    throw new Error(`Failed to fetch API response data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stores dispute resolution outcome in Supabase for audit trail
 */
export async function storeDisputeResolution(
  requestId: string,
  contractAddress: string,
  decision: { refund: boolean; reason: string },
  transactionHash: string,
  agentAddress: string
): Promise<void> {
  try {
    const { error } = await getSupabaseClient()
      .from('dispute_resolutions')
      .insert({
        request_id: requestId,
        contract_address: contractAddress,
        refund_decision: decision.refund,
        reason: decision.reason,
        transaction_hash: transactionHash,
        agent_address: agentAddress,
        resolved_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing dispute resolution:', error);
      // Don't throw - this is optional audit logging
    }
  } catch (error) {
    console.error('Error storing dispute resolution:', error);
    // Don't throw - this is optional audit logging
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