import { NextRequest, NextResponse } from 'next/server';
import { escalateDispute } from '@/lib/contracts/dispute-actions';
import { clearRequestCache } from '@/lib/actions/get-contract-status';
import type { Hex, Address } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, requestId, escrowAddress } = body;

    if (!sessionId || !requestId || !escrowAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, requestId, escrowAddress' },
        { status: 400 }
      );
    }

    const requestIdHex = requestId.startsWith('0x') ? requestId : `0x${requestId}`;

    console.log('[API] Escalating dispute:', {
      sessionId,
      requestId: requestIdHex,
      escrowAddress,
    });

    const result = await escalateDispute(sessionId, {
      requestId: requestIdHex as Hex,
      escrowAddress: escrowAddress as Address,
    });

    if (!result.success) {
      console.error('[API] Failed to escalate dispute:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to escalate dispute' },
        { status: 500 }
      );
    }

    console.log('[API] Dispute escalated successfully:', result.transactionHash);

    // Clear cache so next status check gets fresh data
    clearRequestCache(requestId, escrowAddress);

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
    });
  } catch (error) {
    console.error('[API] Error escalating dispute:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

