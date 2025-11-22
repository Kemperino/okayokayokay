import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateAnonymousWallet } from '@/lib/cdp/session-wallet';
import { getSessionUsdcBalance, getSessionEthBalance } from '@/lib/cdp/session-wallet-operations';

/**
 * GET /api/wallet?sessionId=...
 * Get or create anonymous wallet and return wallet info + balances
 * No authentication required
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      );
    }

    // Get or create wallet for this session
    const { wallet, account } = await getOrCreateAnonymousWallet(sessionId);

    // Get balances
    const [usdcBalance, ethBalance] = await Promise.all([
      getSessionUsdcBalance(sessionId),
      getSessionEthBalance(sessionId),
    ]);

    return NextResponse.json({
      walletAddress: wallet.wallet_address,
      usdcBalance,
      ethBalance,
      network: wallet.network,
      createdAt: wallet.created_at,
    });
  } catch (err) {
    console.error('Error in wallet API:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
