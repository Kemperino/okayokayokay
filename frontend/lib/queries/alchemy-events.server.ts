import { createServerClient } from "@/lib/supabase/server";
import type { AlchemyEvent } from "./alchemy-events";

/**
 * SERVER-SIDE ONLY queries
 * Use these in Server Components, Server Actions, and API Routes
 */

/**
 * Fetch all events (latest first)
 */
export async function getAllEvents(limit = 100) {
  const supabase = await createServerClient();

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
 * Fetch events by recipient address
 */
export async function getEventsByRecipient(toAddress: string, limit = 100) {
  const supabase = await createServerClient();

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

/**
 * Fetch events by authorizer
 */
export async function getEventsByAuthorizer(authorizer: string, limit = 100) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('alchemy_events')
    .select('*')
    .eq('authorizer', authorizer.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching events by authorizer:', error);
    return { data: null, error };
  }

  return { data: data as AlchemyEvent[], error: null };
}

/**
 * Fetch event by nonce
 */
export async function getEventByNonce(nonce: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('alchemy_events')
    .select('*')
    .eq('nonce', nonce)
    .single();

  if (error) {
    console.error('Error fetching event by nonce:', error);
    return { data: null, error };
  }

  return { data: data as AlchemyEvent, error: null };
}

/**
 * Fetch event by transaction hash
 */
export async function getEventByTxHash(txHash: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('alchemy_events')
    .select('*')
    .eq('tx_hash', txHash.toLowerCase())
    .single();

  if (error) {
    console.error('Error fetching event by tx hash:', error);
    return { data: null, error };
  }

  return { data: data as AlchemyEvent, error: null };
}

/**
 * Fetch events in date range
 */
export async function getEventsByDateRange(startDate: Date, endDate: Date) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('alchemy_events')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching events by date range:', error);
    return { data: null, error };
  }

  return { data: data as AlchemyEvent[], error: null };
}
