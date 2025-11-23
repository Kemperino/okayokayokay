import { NextRequest, NextResponse } from 'next/server';
import { canOpenDispute } from '@/lib/actions/get-contract-status';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('requestId');
    const escrowAddress = searchParams.get('escrowAddress');

    if (!requestId || !escrowAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: requestId, escrowAddress' },
        { status: 400 }
      );
    }

    const can = await canOpenDispute(requestId, escrowAddress);

    return NextResponse.json({ can });
  } catch (error) {
    console.error('Error checking if can open dispute:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

