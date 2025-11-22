import { NextRequest, NextResponse } from 'next/server';
import { getResourceRequestsBySeller } from '@/lib/queries/resources.server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const seller = searchParams.get('seller');

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller address is required' },
        { status: 400 }
      );
    }

    // Fetch resource requests for this seller
    const result = await getResourceRequestsBySeller(seller, 100);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    const allRequests = result.data || [];

    // Filter active requests (paid/pending - not yet completed/failed)
    const activeRequests = allRequests.filter(req =>
      req.status === 'paid' || req.status === 'pending'
    );

    return NextResponse.json({
      transactions: allRequests,
      active: activeRequests,
    });
  } catch (error) {
    console.error('Error fetching merchant transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
