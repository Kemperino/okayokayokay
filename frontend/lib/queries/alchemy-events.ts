import { supabase } from "@/lib/supabase/client";

// Types for our events
export type AlchemyEvent = {
  id: number;
  type: string | null;
  network: string | null;
  tx_hash: string | null;
  block_number: number | null;
  authorizer: string | null;
  nonce: string | null;
  from_address: string | null;
  to_address: string | null;
  amount: string | null;
  raw_payload: any;
  created_at: string;
};

// ============================================
// CLIENT-SIDE QUERIES (for Client Components)
// ============================================
// For server-side queries, use @/lib/queries/alchemy-events.server

/**
 * Fetch all events from client
 */
export async function getAllEventsClient(limit = 100) {
  const { data, error } = await supabase
    .from('alchemy_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching events:', error);
    return { data: null, error };
  }

  return { data: data as AlchemyEvent[], error: null };
}

/**
 * Fetch events by recipient from client
 */
export async function getEventsByRecipientClient(toAddress: string, limit = 100) {
  const { data, error } = await supabase
    .from('alchemy_events')
    .select('*')
    .eq('to_address', toAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching events by recipient:', error);
    return { data: null, error };
  }

  return { data: data as AlchemyEvent[], error: null };
}

// ============================================
// REALTIME SUBSCRIPTIONS (Client Components)
// ============================================

/**
 * Subscribe to new events in real-time
 * @param callback Function to call when new event is inserted
 * @returns Unsubscribe function
 */
export function subscribeToNewEvents(callback: (event: AlchemyEvent) => void) {
  const channel = supabase
    .channel('alchemy_events_inserts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alchemy_events'
      },
      (payload) => {
        callback(payload.new as AlchemyEvent);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to events for a specific recipient
 */
export function subscribeToRecipientEvents(
  toAddress: string,
  callback: (event: AlchemyEvent) => void
) {
  const channel = supabase
    .channel(`recipient_${toAddress}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alchemy_events',
        filter: `to_address=eq.${toAddress.toLowerCase()}`
      },
      (payload) => {
        callback(payload.new as AlchemyEvent);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
