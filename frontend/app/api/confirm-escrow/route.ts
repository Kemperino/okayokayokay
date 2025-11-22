import { NextRequest, NextResponse } from "next/server";
import { callConfirmEscrow } from "@/lib/contracts/operator-actions";
import type { Address, Hex } from "viem";

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// ERC-20 Transfer event signature
const TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// AuthorizationUsed event signature (EIP-3009)
const AUTHORIZATION_USED_SIGNATURE = '0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5';

// Helper: Clean padded address back to 20 bytes
function cleanAddress(paddedAddress: string | undefined): string | null {
  if (!paddedAddress) return null;
  // Remove 0x prefix, take last 40 chars (20 bytes), add 0x back
  const cleaned = paddedAddress.replace(/^0x0*/, '0x');
  // Ensure it's a valid address format (0x + 40 hex chars)
  if (cleaned.length === 42) return cleaned.toLowerCase();
  // If still padded, take last 40 chars
  if (paddedAddress.length === 66) {
    return '0x' + paddedAddress.slice(-40).toLowerCase();
  }
  return paddedAddress.toLowerCase();
}

/**
 * Alchemy webhook handler for confirmEscrow
 *
 * This endpoint is triggered by Alchemy webhooks when a USDC Transfer event
 * is detected where the 'to' address is in the watchlist (configured in Alchemy).
 *
 * It validates that the transaction also contains a TransferWithAuthorization
 * or AuthorizationUsed event, then logs the relevant addresses and tx hashes.
 *
 * Note: The watchlist filtering happens in the Alchemy GraphQL query itself,
 * so this endpoint only receives transfers to addresses you've configured.
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the webhook payload
    const body = await req.json();

    // Extract block data from GraphQL response structure
    const block = body?.event?.data?.block ?? body?.data?.block ?? null;

    if (!block) {
      console.log('[confirmEscrow] No block data found in webhook payload');
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const logs = block?.logs ?? [];
    console.log(`[confirmEscrow] Processing ${logs.length} log(s) from block ${block.number}`);

    const validTransfers: Array<{
      txHash: string;
      from: string | null;
      to: string | null;
      amount: string;
      authorizer: string | null;
      nonce: string | null;
      blockNumber: number | null;
    }> = [];

    // Process each USDC Transfer log
    for (const usdcLog of logs) {
      const tx = usdcLog.transaction;

      if (!tx) {
        console.log('[confirmEscrow] Log has no transaction data, skipping');
        continue;
      }

      const txHash = tx.hash;
      const txLogs = tx.logs ?? [];

      // Check if this transaction has a TransferWithAuthorization or AuthorizationUsed event
      const hasAuthEvent = txLogs.some((inner: any) => {
        const sig = inner.topics?.[0]?.toLowerCase();
        return sig === AUTHORIZATION_USED_SIGNATURE.toLowerCase();
      });

      if (!hasAuthEvent) {
        console.log(`[confirmEscrow] Transaction ${txHash} does not contain AuthorizationUsed event, skipping`);
        continue;
      }

      // Extract transfer details from the USDC Transfer event
      const fromAddress = cleanAddress(usdcLog.topics?.[1]);
      const toAddress = cleanAddress(usdcLog.topics?.[2]);
      const amount = usdcLog.data ? BigInt(usdcLog.data).toString() : '0';

      // Extract authorizer and nonce from AuthorizationUsed event
      let authorizer: string | null = null;
      let nonce: string | null = null;

      for (const txLog of txLogs) {
        if (txLog.topics?.[0]?.toLowerCase() === AUTHORIZATION_USED_SIGNATURE.toLowerCase()) {
          authorizer = cleanAddress(txLog.topics?.[1]);
          nonce = txLog.topics?.[2]; // Keep nonce as-is (32 bytes)
          break;
        }
      }

      // Log the valid transfer with auth
      console.log('='.repeat(60));
      console.log('[confirmEscrow] Valid TransferWithAuth detected');
      console.log(`  Transaction Hash: ${txHash}`);
      console.log(`  From: ${fromAddress}`);
      console.log(`  To: ${toAddress}`);
      console.log(`  Amount: ${amount} (raw USDC units, 6 decimals)`);
      console.log(`  Authorizer: ${authorizer}`);
      console.log(`  Nonce: ${nonce}`);
      console.log(`  Block: ${block.number}`);
      console.log('='.repeat(60));

      // Call confirmEscrow on the smart contract
      let confirmResult = null;
      if (fromAddress && toAddress && nonce) {
        try {
          console.log('[confirmEscrow] Calling confirmEscrow on-chain...');
          confirmResult = await callConfirmEscrow(
            nonce as Hex,                    // requestId (nonce from transferWithAuth)
            fromAddress as Address,          // buyer address
            BigInt(amount),                  // amount
            toAddress as Address,            // contract address (the escrow address that received the USDC)
            '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex // apiResponseHash (placeholder)
          );

          if (confirmResult.success) {
            console.log(`[confirmEscrow] ✅ On-chain confirmation successful: ${confirmResult.txHash}`);
          } else {
            console.error(`[confirmEscrow] ❌ On-chain confirmation failed: ${confirmResult.error}`);
          }
        } catch (error) {
          console.error('[confirmEscrow] Exception calling on-chain confirmEscrow:', error);
        }
      }

      validTransfers.push({
        txHash,
        from: fromAddress,
        to: toAddress,
        amount,
        authorizer,
        nonce,
        blockNumber: block.number,
        confirmTxHash: confirmResult?.txHash,
        confirmSuccess: confirmResult?.success ?? false,
      });
    }

    if (validTransfers.length === 0) {
      console.log('[confirmEscrow] No valid TransferWithAuth transactions found in this webhook');
      return NextResponse.json({
        ok: true,
        message: 'No valid transfers found',
        processed: 0,
      });
    }

    // Return success with processed transfers
    return NextResponse.json({
      ok: true,
      message: `Processed ${validTransfers.length} valid transfer(s)`,
      processed: validTransfers.length,
      transfers: validTransfers,
    });

  } catch (error) {
    console.error('[confirmEscrow] Error processing webhook:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
