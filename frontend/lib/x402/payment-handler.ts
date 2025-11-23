import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import { toAccount } from 'viem/accounts';
import { getAnonymousCdpAccount } from '@/lib/cdp/session-wallet';
import { createPublicClient, http, type Hex } from 'viem';
import { base } from 'viem/chains';

export interface X402PaymentResult {
  success: boolean;
  data?: any;
  error?: string;
  paymentDetails?: {
    txHash: string;
    amount: string;
    to: string;  // The escrow contract address where USDC was sent
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
        const txHash = paymentResponse?.transaction;

        // Fetch the transaction to get the 'to' address (escrow contract) and nonce
        if (txHash) {
          try {
            const publicClient = createPublicClient({
              chain: base,
              transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
            });

            const receipt = await publicClient.getTransactionReceipt({
              hash: txHash as Hex,
            });

            // The 'to' address is the escrow contract that received the USDC
            // Find the Transfer event to get the recipient and amount
            const transferEvent = receipt.logs.find(
              log => log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event
            );

            // Find AuthorizationUsed event to get the nonce
            const authEvent = receipt.logs.find(
              log => log.topics[0] === '0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5' // AuthorizationUsed event
            );

            const escrowAddress = transferEvent?.topics[2]
              ? `0x${transferEvent.topics[2].slice(-40)}` // Clean padded address
              : 'unknown';

            const nonce = authEvent?.topics[2] || undefined;

            const amount = transferEvent?.data
              ? BigInt(transferEvent.data).toString()
              : 'unknown';

            paymentDetails = {
              txHash,
              amount,
              to: escrowAddress,
              nonce,
            };
          } catch (receiptErr) {
            console.warn('[x402] Failed to fetch transaction receipt:', receiptErr);
            paymentDetails = {
              txHash,
              amount: 'unknown',
              to: 'unknown',
              nonce: undefined,
            };
          }
        } else {
          paymentDetails = {
            txHash: 'unknown',
            amount: 'unknown',
            to: 'unknown',
            nonce: undefined,
          };
        }
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

