import { NextRequest, NextResponse } from 'next/server';
import {
  getResourceById,
  createResourceRequest,
} from '@/lib/queries/resources.server';
import { makeX402RequestForSession } from '@/lib/x402/payment-handler';
import { getSessionWalletAddress } from '@/lib/cdp/session-wallet-operations';
import { fetchWellKnown } from '@/lib/x402/well-known-fetcher';

/**
 * x402 Resource Proxy with Anonymous CDP Wallet
 *
 * POST /api/proxy-resource
 * Body: {
 *   resourceId: string,
 *   path: string,
 *   params?: Record<string, string>,
 *   sessionId: string
 * }
 *
 * This endpoint uses the session's CDP wallet to make x402 payments automatically.
 * No authentication required.
 */
export async function POST(req: NextRequest) {
  try {
    const { resourceId, path, params, sessionId } = await req.json();

    if (!resourceId || !path || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceId, path, sessionId' },
        { status: 400 }
      );
    }

    // Get session wallet address
    const walletAddress = await getSessionWalletAddress(sessionId);

    // Get resource details
    const { data: resource, error: resourceError } = await getResourceById(resourceId);

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Build URL
    const url = new URL(path, resource.base_url);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Fetch .well-known/x402 data for seller description (cached)
    const wellKnownData = await fetchWellKnown(url.toString());

    // Make x402 request using session's CDP wallet
    const result = await makeX402RequestForSession(url.toString(), sessionId);

    if (!result.success) {
      const requestId = `failed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const inputData = { path, params: params || null };
      const sellerAddress = result.paymentDetails?.to || resource.payment_address || 'unknown';

      await createResourceRequest({
        request_id: requestId,
        input_data: inputData,
        output_data: null,
        seller_address: sellerAddress,
        user_address: walletAddress,
        seller_description: wellKnownData || resource.well_known_data || null,
        tx_hash: null,
        resource_url: url.toString(),
        status: 'failed',
        error_message: result.error || 'Unknown error',
        escrow_contract_address: result.paymentDetails?.to || null,
      });

      return NextResponse.json(
        { error: result.error || 'Request failed' },
        { status: 500 }
      );
    }

    // Extract seller address from the response data (merchantPublicKey)
    const merchantPublicKey = result.data?.merchantPublicKey;
    const sellerAddress = merchantPublicKey || resource.payment_address || result.paymentDetails?.to || 'unknown';
    const requestId = result.data?.requestId || result.paymentDetails?.txHash || `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const inputData = { path, params: params || null };

    // The escrow contract address is the payment recipient (where x402 payment was sent)
    const escrowContractAddress = result.paymentDetails?.to || null;

    await createResourceRequest({
      request_id: requestId,
      input_data: inputData,
      output_data: result.data,
      seller_address: sellerAddress,
      user_address: walletAddress,
      seller_description: wellKnownData || resource.well_known_data || null,
      tx_hash: result.paymentDetails?.txHash || null,
      resource_url: url.toString(),
      status: 'completed',
      error_message: null,
      escrow_contract_address: escrowContractAddress,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      paymentDetails: result.paymentDetails,
      sessionWallet: walletAddress,
    });
  } catch (err) {
    console.error('Error in proxy-resource API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

