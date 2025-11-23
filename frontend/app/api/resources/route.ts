import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveResources,
  createResource,
  updateResourceWellKnown,
  getResourceByUrl,
} from '@/lib/queries/resources.server';

/**
 * GET /api/resources
 * List all active resources or get a specific resource by URL
 * Query params:
 * - url: Get resource by base URL
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (url) {
      const { data, error } = await getResourceByUrl(url);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ resource: data });
    }

    const { data, error } = await getActiveResources();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resources: data, count: data?.length || 0 });
  } catch (err) {
    console.error('Error in resources API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/resources
 * Create a new resource
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   baseUrl: string,
 *   fetchWellKnown?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description, baseUrl, fetchWellKnown = true } = await req.json();

    if (!name || !baseUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, baseUrl' },
        { status: 400 }
      );
    }

    // Ensure baseUrl ends without trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const wellKnownUrl = `${cleanBaseUrl}/.well-known/x402`;

    let wellKnownData = null;
    let paymentAddress = null;
    let pricePerRequest = null;

    // Fetch .well-known/x402 if requested
    if (fetchWellKnown) {
      try {
        const response = await fetch(wellKnownUrl);
        if (response.ok) {
          wellKnownData = await response.json();

          // Extract payment info if available
          if (wellKnownData.payment) {
            paymentAddress = wellKnownData.payment.address;
            pricePerRequest = wellKnownData.payment.pricePerRequest;
          }
        } else {
          console.warn(`Failed to fetch .well-known/x402 from ${wellKnownUrl}`);
        }
      } catch (error) {
        console.error('Error fetching .well-known/x402:', error);
      }
    }

    // Create resource
    const { data, error } = await createResource({
      name,
      description: description || null,
      base_url: cleanBaseUrl,
      well_known_url: wellKnownUrl,
      well_known_data: wellKnownData,
      payment_address: paymentAddress,
      price_per_request: pricePerRequest,
      is_active: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resource: data }, { status: 201 });
  } catch (err) {
    console.error('Error creating resource:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
