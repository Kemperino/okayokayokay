import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAlchemySignature } from "@/lib/alchemy/signature";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // These depend heavily on webhook type; adjust once payload is known
    const txHash =
      body?.event?.transaction?.hash ??
      body?.event?.transactionHash ??
      body?.transaction?.hash ??
      null;

    const blockNumber =
      body?.event?.blockNumber ??
      body?.event?.block?.number ??
      body?.block?.number ??
      null;

    // 5) Insert into Supabase
    const { error } = await supabaseAdmin.from("alchemy_events").insert({
      type,
      network,
      tx_hash: txHash,
      block_number: blockNumber,
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
