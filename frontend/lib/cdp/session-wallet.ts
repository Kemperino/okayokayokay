import { cdpClient } from './client';
import { createServerClient } from '@/lib/supabase/server';
import type { EvmServerAccount } from '@coinbase/cdp-sdk';

export interface SessionWallet {
  id: string;
  session_id: string;
  cdp_wallet_name: string;
  wallet_address: string;
  network: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a persistent session ID (stored in localStorage on client)
 * This is called from the client-side and passed to server
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a short, valid CDP account name from session ID
 * CDP requires: alphanumeric + hyphens, 2-36 chars
 */
function generateCdpAccountName(sessionId: string): string {
  // Hash the session ID to create a shorter, deterministic name
  const hash = sessionId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  // Create a short unique ID (max 36 chars for CDP)
  const shortId = Math.abs(hash).toString(36).substring(0, 10);
  return `user-${shortId}`;
}

/**
 * Get or create a CDP wallet for a session
 * No authentication required - wallet tied to browser session ID
 */
export async function getOrCreateAnonymousWallet(sessionId: string): Promise<{
  wallet: SessionWallet;
  account: EvmServerAccount;
}> {
  const supabase = await createServerClient();

  // Try to get existing wallet from DB
  const { data: existingWallet } = await supabase
    .from('session_wallets')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (existingWallet) {
    // Wallet exists in DB, get it from CDP
    const account = await cdpClient.evm.getOrCreateAccount({
      name: existingWallet.cdp_wallet_name,
    });

    return {
      wallet: existingWallet,
      account,
    };
  }

  // Create new CDP wallet with short, valid name
  const cdpWalletName = generateCdpAccountName(sessionId);

  try {
    const account = await cdpClient.evm.getOrCreateAccount({
      name: cdpWalletName,
    });

    if (!account || !account.address) {
      throw new Error('CDP account creation failed: no address returned');
    }

    const address = account.address;

    // Store wallet metadata in Supabase
    const { data: newWallet, error } = await supabase
      .from('session_wallets')
      .insert({
        session_id: sessionId,
        cdp_wallet_name: cdpWalletName,
        wallet_address: address.toLowerCase(),
        network: 'base-mainnet',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }

    return {
      wallet: newWallet,
      account,
    };
  } catch (error) {
    console.error('[CDP] Error creating account:', error);
    throw error;
  }
}

/**
 * Get session wallet (without creating if doesn't exist)
 */
export async function getSessionWallet(sessionId: string): Promise<SessionWallet | null> {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from('session_wallets')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  return data;
}

/**
 * Get CDP account for an anonymous session
 */
export async function getAnonymousCdpAccount(sessionId: string): Promise<EvmServerAccount> {
  const { account } = await getOrCreateAnonymousWallet(sessionId);
  return account;
}
