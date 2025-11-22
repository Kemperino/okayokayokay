import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type DisputeStatus =
  | 'service_initiated'
  | 'escrowed'
  | 'escrow_released'
  | 'dispute_opened'
  | 'seller_accepted'
  | 'dispute_escalated'
  | 'dispute_resolved'
  | 'master_review_escalation';

export interface Transaction {
  request_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: DisputeStatus;
  payment_settled_at: string | null;
  dispute_window_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  filed_by: string;
  filed_at: string;
  claim_description: string;
  evidence: any[];
  status: string;
  resolved_at: string | null;
  resolved_in_favor_of: string | null;
  resolution_details: string | null;
  escalated_at: string | null;
  agent_vote_results: any | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get transactions by seller ID
 */
export async function getTransactionsBySeller(sellerAddress: string, limit = 100) {
  return supabase
    .from('transactions')
    .select('*')
    .eq('seller_id', sellerAddress)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get transactions by buyer ID
 */
export async function getTransactionsByBuyer(buyerAddress: string, limit = 100) {
  return supabase
    .from('transactions')
    .select('*')
    .eq('buyer_id', buyerAddress)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get transactions by buyer ID with specific statuses (for disputes/unresolved)
 */
export async function getTransactionsByBuyerAndStatus(
  buyerAddress: string,
  statuses: DisputeStatus[],
  limit = 100
) {
  return supabase
    .from('transactions')
    .select('*')
    .eq('buyer_id', buyerAddress)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get a single transaction by request ID
 */
export async function getTransactionByRequestId(requestId: string) {
  return supabase
    .from('transactions')
    .select('*')
    .eq('request_id', requestId)
    .single();
}

/**
 * Get dispute by transaction ID
 */
export async function getDisputeByTransactionId(transactionId: string) {
  return supabase
    .from('disputes')
    .select('*')
    .eq('transaction_id', transactionId)
    .single();
}

/**
 * Get all disputes filed by a user
 */
export async function getDisputesByUser(userAddress: string, limit = 100) {
  return supabase
    .from('disputes')
    .select(`
      *,
      transaction:transactions(*)
    `)
    .eq('filed_by', userAddress)
    .order('filed_at', { ascending: false })
    .limit(limit);
}

/**
 * Get disputes for transactions where user is the seller
 */
export async function getDisputesForSeller(sellerAddress: string, limit = 100) {
  return supabase
    .from('disputes')
    .select(`
      *,
      transaction:transactions!inner(*)
    `)
    .eq('transaction.seller_id', sellerAddress)
    .order('filed_at', { ascending: false })
    .limit(limit);
}

/**
 * Get buyer's unresolved transactions (in dispute or pending resolution)
 */
export async function getBuyerUnresolvedTransactions(buyerAddress: string, limit = 100) {
  const unresolvedStatuses: DisputeStatus[] = [
    'service_initiated',
    'escrowed',
    'dispute_opened',
    'dispute_escalated',
    'master_review_escalation'
  ];

  return getTransactionsByBuyerAndStatus(buyerAddress, unresolvedStatuses, limit);
}

/**
 * Get seller's active transactions (not yet released or resolved)
 */
export async function getSellerActiveTransactions(sellerAddress: string, limit = 100) {
  const activeStatuses: DisputeStatus[] = [
    'escrowed',
    'dispute_opened',
    'dispute_escalated'
  ];

  return supabase
    .from('transactions')
    .select('*')
    .eq('seller_id', sellerAddress)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(requestId: string, status: DisputeStatus) {
  return supabase
    .from('transactions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('request_id', requestId);
}
