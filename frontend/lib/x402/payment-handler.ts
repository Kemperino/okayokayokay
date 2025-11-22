import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import { toAccount } from 'viem/accounts';
import { getAnonymousCdpAccount } from '@/lib/cdp/session-wallet';

export interface X402PaymentResult {
  success: boolean;
  data?: any;
  error?: string;
  paymentDetails?: {
    txHash: string;
    amount: string;
    to: string;
    nonce?: string;
  };
}

/**
 * Make an x402 request using an anonymous session's CDP wallet
 * Uses CDP account directly without exporting private key
 */
export async function makeX402RequestForSession(
  url: string,
  sessionId: string,
  options?: RequestInit
): Promise<X402PaymentResult> {
  try {
    const cdpAccount = await getAnonymousCdpAccount(sessionId);
    const signer = toAccount(cdpAccount);
    const x402Fetch = wrapFetchWithPayment(fetch, signer);
    const response = await x402Fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Request failed with status ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    // Extract payment details from x-payment-response header
    const paymentResponseHeader = response.headers.get('x-payment-response');
    let paymentDetails;

    if (paymentResponseHeader) {
      try {
        const paymentResponse = decodeXPaymentResponse(paymentResponseHeader);
        paymentDetails = {
          txHash: paymentResponse?.transaction || 'unknown',
          amount: 'unknown', // Amount not available in payment response
          to: 'unknown', // To address not directly available in payment response
          nonce: undefined,
        };
      } catch (err) {
        console.warn('[x402] Failed to decode payment response:', err);
      }
    }

    return {
      success: true,
      data,
      paymentDetails,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get session wallet',
    };
  }
}

