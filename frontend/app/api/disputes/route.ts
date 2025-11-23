import { NextRequest, NextResponse } from 'next/server';
import { getUserDisputes } from '@/lib/actions/get-user-disputes';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const disputes = await getUserDisputes(address);

    return NextResponse.json({
      disputes,
      count: disputes.length,
    });
  } catch (error) {
    console.error('[API] Error fetching disputes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch disputes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

