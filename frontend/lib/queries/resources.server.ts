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
  resource_name?: string | null;
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
  const { data, error } = await supabase
    .from('resource_requests')
    .select('*')
    .eq('seller_address', sellerAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return { data, error };
  }

  // Get unique base URLs from resource_requests
  const baseUrls = new Set<string>();
  data.forEach((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    if (baseUrl) baseUrls.add(baseUrl);
  });

  // Fetch resources for these base URLs
  const { data: resources } = await supabase
    .from('resources')
    .select('base_url, name')
    .in('base_url', Array.from(baseUrls));

  // Create a map of base_url -> resource name
  const resourceNameMap = new Map<string, string>();
  resources?.forEach((resource) => {
    resourceNameMap.set(resource.base_url, resource.name);
  });

  // Add resource_name to each request
  const dataWithResourceNames = data.map((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    const resourceName = baseUrl ? resourceNameMap.get(baseUrl) : null;
    return {
      ...req,
      resource_name: resourceName || null,
    };
  });

  return { data: dataWithResourceNames, error };
}

/**
 * Get resource requests by user address
 */
export async function getResourceRequestsByUser(userAddress: string, limit = 100) {
  const { data, error } = await supabase
    .from('resource_requests')
    .select('*')
    .eq('user_address', userAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return { data, error };
  }

  // Get unique base URLs from resource_requests
  const baseUrls = new Set<string>();
  data.forEach((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    if (baseUrl) baseUrls.add(baseUrl);
  });

  // Fetch resources for these base URLs
  const { data: resources } = await supabase
    .from('resources')
    .select('base_url, name')
    .in('base_url', Array.from(baseUrls));

  // Create a map of base_url -> resource name
  const resourceNameMap = new Map<string, string>();
  resources?.forEach((resource) => {
    resourceNameMap.set(resource.base_url, resource.name);
  });

  // Add resource_name to each request
  const dataWithResourceNames = data.map((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    const resourceName = baseUrl ? resourceNameMap.get(baseUrl) : null;
    return {
      ...req,
      resource_name: resourceName || null,
    };
  });

  return { data: dataWithResourceNames, error };
}

/**
 * Get recent resource requests across all resources
 */
export async function getRecentResourceRequests(limit = 50) {
  const { data, error } = await supabase
    .from('resource_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return { data, error };
  }

  // Get unique base URLs from resource_requests
  const baseUrls = new Set<string>();
  data.forEach((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    if (baseUrl) baseUrls.add(baseUrl);
  });

  // Fetch resources for these base URLs
  const { data: resources } = await supabase
    .from('resources')
    .select('base_url, name')
    .in('base_url', Array.from(baseUrls));

  // Create a map of base_url -> resource name
  const resourceNameMap = new Map<string, string>();
  resources?.forEach((resource) => {
    resourceNameMap.set(resource.base_url, resource.name);
  });

  // Add resource_name to each request
  const dataWithResourceNames = data.map((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    const resourceName = baseUrl ? resourceNameMap.get(baseUrl) : null;
    return {
      ...req,
      resource_name: resourceName || null,
    };
  });

  return { data: dataWithResourceNames, error };
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

/**
 * Extract base URL from a full resource URL
 */
function extractBaseUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return null;
  }
}

/**
 * Get paginated resource requests
 */
export async function getPaginatedResourceRequests(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('resource_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) {
    return {
      data,
      error,
      count: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    };
  }

  // Get unique base URLs from resource_requests
  const baseUrls = new Set<string>();
  data.forEach((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    if (baseUrl) baseUrls.add(baseUrl);
  });

  // Fetch resources for these base URLs
  const { data: resources } = await supabase
    .from('resources')
    .select('base_url, name')
    .in('base_url', Array.from(baseUrls));

  // Create a map of base_url -> resource name
  const resourceNameMap = new Map<string, string>();
  resources?.forEach((resource) => {
    resourceNameMap.set(resource.base_url, resource.name);
  });

  // Add resource_name to each request
  const dataWithResourceNames = data.map((req) => {
    const baseUrl = extractBaseUrl(req.resource_url);
    const resourceName = baseUrl ? resourceNameMap.get(baseUrl) : null;
    return {
      ...req,
      resource_name: resourceName || null,
    };
  });

  return {
    data: dataWithResourceNames,
    error,
    count: count || 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}
