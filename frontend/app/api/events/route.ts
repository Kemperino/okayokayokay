import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents, getEventsByRecipient, getEventByNonce } from '@/lib/queries/alchemy-events.server';

/**
 * API Route for fetching Alchemy events
 *
 * GET /api/events - Get all events
 * GET /api/events?recipient=0x... - Get events by recipient
 * GET /api/events?nonce=0x... - Get event by nonce
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const recipient = searchParams.get('recipient');
  const nonce = searchParams.get('nonce');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    // Query by nonce (exact match)
    if (nonce) {
      const { data, error } = await getEventByNonce(nonce);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ event: data });
    }

    // Query by recipient
    if (recipient) {
      const { data, error } = await getEventsByRecipient(recipient, limit);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ events: data, count: data?.length || 0 });
    }

    // Get all events
    const { data, error } = await getAllEvents(limit);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data, count: data?.length || 0 });
  } catch (err) {
    console.error('Error in events API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
