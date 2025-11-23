import { NextRequest, NextResponse } from 'next/server';
import { getResourceRequestsByUser } from '@/lib/queries/resources.server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Fetch resource requests for this user
    const result = await getResourceRequestsByUser(address, 100);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requests: result.data || [],
    });
  } catch (error) {
    console.error('Error fetching resource requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
