import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  base_url: string;
  well_known_url: string;
  well_known_data: any | null;
  payment_address: string | null;
  price_per_request: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceRequest {
  request_id: string;
  input_data: any;
  output_data: any | null;
  seller_address: string;
  user_address: string;
  seller_description: any | null;
  tx_hash: string | null;
  resource_url: string | null;
  status: string;
  error_message: string | null;
  escrow_contract_address: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Get all active resources
 */
export async function getActiveResources() {
  return supabase
    .from('resources')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
}

/**
 * Get a resource by ID
 */
export async function getResourceById(id: string) {
  return supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();
}

/**
 * Get a resource by base URL
 */
export async function getResourceByUrl(baseUrl: string) {
  return supabase
    .from('resources')
    .select('*')
    .eq('base_url', baseUrl)
    .single();
}

/**
 * Create a new resource
 */
export async function createResource(resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>) {
  return supabase
    .from('resources')
    .insert(resource)
    .select()
    .single();
}

/**
 * Update resource well-known data
 */
export async function updateResourceWellKnown(id: string, wellKnownData: any) {
  return supabase
    .from('resources')
    .update({
      well_known_data: wellKnownData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Create a resource request log
 */
export async function createResourceRequest(request: Omit<ResourceRequest, 'created_at' | 'completed_at'>) {
  const result = await supabase
    .from('resource_requests')
    .insert(request)
    .select()
    .single();

  if (result.error) {
    console.error('[DB] Insert failed:', result.error);
    throw new Error(`Database insert failed: ${result.error.message}`);
  }

  return result;
}

/**
 * Update a resource request by request_id
 */
export async function updateResourceRequest(requestId: string, updates: Partial<ResourceRequest>) {
  return supabase
    .from('resource_requests')
    .update({
      ...updates,
      completed_at: updates.status === 'completed' || updates.status === 'failed' ? new Date().toISOString() : undefined,
    })
    .eq('request_id', requestId);
}

/**
 * Get resource requests by seller address
 */
export async function getResourceRequestsBySeller(sellerAddress: string, limit = 100) {
  return supabase
    .from('resource_requests')
    .select('*')
    .eq('seller_address', sellerAddress)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get resource requests by user address
 */
export async function getResourceRequestsByUser(userAddress: string, limit = 100) {
  return supabase
    .from('resource_requests')
    .select('*')
    .eq('user_address', userAddress)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get recent resource requests across all resources
 */
export async function getRecentResourceRequests(limit = 50) {
  return supabase
    .from('resource_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get a resource request by request_id
 */
export async function getResourceRequestById(requestId: string) {
  return supabase
    .from('resource_requests')
    .select('*')
    .eq('request_id', requestId)
    .single();
}
