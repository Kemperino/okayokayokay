import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAlchemySignature } from "@/lib/alchemy/signature";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Remove padding from hex-encoded addresses (32 bytes -> 20 bytes)
function cleanAddress(paddedAddress: string | null): string | null {
  if (!paddedAddress) return null;
  // Remove 0x prefix, take last 40 chars (20 bytes), add 0x back
  const cleaned = paddedAddress.replace(/^0x0+/, "0x");
  // Ensure it's a valid address format (0x + 40 hex chars)
  if (cleaned.length === 42) return cleaned;
  // If still padded, take last 40 chars
  if (paddedAddress.length === 66) {
    return "0x" + paddedAddress.slice(-40);
  }
  return paddedAddress;
}

// Helper: Decode hex amount to decimal string
function decodeAmount(hexAmount: string | null): string | null {
  if (!hexAmount) return null;
  try {
    return BigInt(hexAmount).toString();
  } catch {
    return hexAmount;
  }
}

// Helper: Keep nonce as-is (32 bytes, don't strip padding)
function cleanNonce(nonce: string | null): string | null {
  if (!nonce) return null;
  // Nonce is always 32 bytes - keep it as-is for proper identification
  return nonce;
}

// Helper: Check if recipient address is in allowed list
function isAllowedRecipient(toAddress: string | null): boolean {
  if (!toAddress) return false;

  const allowedRecipients = process.env.ALLOWED_RECIPIENT_ADDRESSES;
  if (!allowedRecipients || allowedRecipients.trim() === '') {
    // If not configured, allow all recipients
    return true;
  }

  const allowedList = allowedRecipients
    .split(',')
    .map(addr => addr.trim().toLowerCase())
    .filter(addr => addr.length > 0);

  return allowedList.includes(toAddress.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    // 1) Read body as text (keeps door open for signature verification)
    const rawBody = await req.text();

    // 2) Parse JSON payload
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("Invalid JSON from Alchemy:", e);
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // 3) Validate Alchemy signature if signing key is configured
    const signature = req.headers.get("x-alchemy-signature");
    if (process.env.ALCHEMY_WEBHOOK_SIGNING_KEY) {
      const isValid = validateAlchemySignature(
        rawBody,
        signature,
        process.env.ALCHEMY_WEBHOOK_SIGNING_KEY
      );
      if (!isValid) {
        console.error("Invalid Alchemy signature");
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    // 4) Extract common fields (defensive: not all payloads have all fields)
    const type = body?.type ?? null;
    const network = body?.network ?? body?.event?.network ?? null;

    // Extract block data from GraphQL response structure
    const block = body?.event?.data?.block ?? body?.data?.block ?? null;
    const blockNumber = block?.number ?? null;
    const blockHash = block?.hash ?? null;

    // Extract TransferWithAuthorization event data
    let txHash = null;
    let authorizer = null;
    let nonce = null;
    let fromAddress = null;
    let toAddress = null;
    let amount = null;
    let tokenContract = null;

    // Parse AuthorizationUsed event from block.logs
    const logs = block?.logs ?? [];

    for (const log of logs) {
      // AuthorizationUsed event signature: 0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5
      if (log.topics?.[0] === "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5") {
        // Extract token contract address
        tokenContract = log.account?.address ?? null;

        // Extract transaction hash from the log's transaction
        txHash = log.transaction?.hash ?? null;

        // topics[1] = authorizer (indexed, padded to 32 bytes)
        // topics[2] = nonce (indexed)
        authorizer = cleanAddress(log.topics[1]);
        nonce = cleanNonce(log.topics[2]);

        // Find Transfer event in the same transaction to get from/to/amount
        const txLogs = log.transaction?.logs ?? [];
        for (const txLog of txLogs) {
          // Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
          if (txLog.topics?.[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
            // topics[1] = from (indexed, padded)
            // topics[2] = to (indexed, padded)
            // data = amount (hex encoded)
            fromAddress = cleanAddress(txLog.topics[1]);
            toAddress = cleanAddress(txLog.topics[2]);
            amount = decodeAmount(txLog.data);
            break;
          }
        }

        // Check if recipient is in allowed list (after extracting toAddress)
        if (!isAllowedRecipient(toAddress)) {
          console.log(`Skipping event - recipient not in allowed list: ${toAddress}`);
          continue;
        }

        // If we get here, we found a valid event with allowed recipient
        break;
      }
    }

    // Skip if no valid AuthorizationUsed event found (or filtered out)
    if (!authorizer || !nonce) {
      console.log("No valid TransferWithAuthorization event found for allowed recipients. Skipping.");
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    // 5) Insert into Supabase
    const { error } = await supabaseAdmin.from("alchemy_events").insert({
      type,
      network,
      tx_hash: txHash,
      block_number: blockNumber,
      authorizer,
      nonce,
      from_address: fromAddress,
      to_address: toAddress,
      amount,
      raw_payload: body,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Database insert failed" },
        { status: 500 }
      );
    }

    // 6) Respond quickly to Alchemy
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in webhook handler:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
