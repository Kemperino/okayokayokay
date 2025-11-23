"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

import ContractStatusBadge from "./ContractStatusBadge";
import { getContractNextDeadline } from "@/lib/actions/get-contract-status";
import { useEffect, useState } from "react";

interface ResourceRequest {
  request_id: string;
  input_data: any;
  output_data: any | null;
  seller_address: string;
  user_address: string;
  seller_description: any | null;
  tx_hash: string | null;
  resource_url: string | null;
  status: string;
  error_message: string | null;
  escrow_contract_address: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ResourceRequestCardProps {
  request: ResourceRequest;
}

// Extract description from seller_description (x402 well-known data)
const getSellerDescription = (sellerDescription: any): string | null => {
  if (!sellerDescription) return null;

  // Handle the x402 well-known format
  if (sellerDescription.accepts && Array.isArray(sellerDescription.accepts)) {
    const firstAccept = sellerDescription.accepts[0];
    return firstAccept?.description || null;
  }

  // Fallback for other formats
  if (typeof sellerDescription === "string") {
    return sellerDescription;
  }

  return null;
};

// Format countdown time remaining
const formatCountdown = (secondsRemaining: number): string => {
  if (secondsRemaining <= 0) {
    return "Deadline passed";
  }

  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
};

export default function ResourceRequestCard({
  request,
}: ResourceRequestCardProps) {
  const description = getSellerDescription(request.seller_description);
  const params = request.input_data?.params || {};
  const path = request.input_data?.path || request.resource_url || "Unknown";

  const [nextDeadline, setNextDeadline] = useState<bigint | number | null>(
    null
  );
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    const fetchNextDeadline = async () => {
      const newNextDeadline = await getContractNextDeadline(
        request.request_id,
        request.escrow_contract_address
      );

      if (newNextDeadline !== null) {
        setNextDeadline(newNextDeadline);
      }
    };

    fetchNextDeadline();
  }, [request.request_id, request.escrow_contract_address]);

  // Update countdown every second
  useEffect(() => {
    if (nextDeadline === null) {
      setCountdown("");
      return;
    }

    // Convert BigInt to number if needed (Unix timestamp in seconds)
    const deadlineTimestamp =
      typeof nextDeadline === "bigint" ? Number(nextDeadline) : nextDeadline;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const secondsRemaining = deadlineTimestamp - now;
      setCountdown(formatCountdown(secondsRemaining));
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextDeadline]);

  return (
    <Link
      href={`/transactions/${request.request_id}`}
      className="block border border-contrast rounded-lg p-4 bg-default shadow-sm hover:shadow hover:border-highlight transition cursor-pointer"
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {description && (
            <div className="text-sm font-semibold text-primary mb-1">
              {description}
            </div>
          )}
          <div className="text-sm text-primary/70 font-mono break-all">
            {path}
          </div>
        </div>
        <div className="flex-shrink-0">
          <ContractStatusBadge
            requestId={request.request_id}
            escrowContractAddress={request.escrow_contract_address}
          />
        </div>
      </div>

      <div className="space-y-2 text-xs text-primary/70">
        {params && Object.keys(params).length > 0 && (
          <div>
            <span className="font-semibold text-primary/80">Params:</span>{" "}
            {Object.entries(params)
              .map(([k, v]) => `${k}=${v}`)
              .join(", ")}
          </div>
        )}

        {request.user_address && (
          <div>
            <span className="font-semibold text-primary/80">User:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-xs text-primary font-mono">
              {request.user_address}
            </code>
          </div>
        )}

        {request.seller_address && (
          <div>
            <span className="font-semibold text-primary/80">Seller:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-xs text-primary font-mono">
              {request.seller_address}
            </code>
          </div>
        )}

        {request.tx_hash && (
          <div>
            <span className="font-semibold text-primary/80">Tx:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-primary font-mono break-all">
              {request.tx_hash}
            </code>
          </div>
        )}

        {request.escrow_contract_address && (
          <div>
            <span className="font-semibold">Escrow:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-xs text-primary font-mono">
              {request.escrow_contract_address}
            </code>
          </div>
        )}

        {request.error_message && (
          <div className="text-error">
            <span className="font-semibold">Error:</span>{" "}
            {request.error_message}
          </div>
        )}

        {countdown && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-primary/80" />
            <span className="font-semibold text-primary/80">
              Next Deadline:
            </span>
            <span className="text-primary font-mono">{countdown}</span>
          </div>
        )}

        <div className="text-primary/50">
          {new Date(request.created_at).toLocaleString()}
        </div>
      </div>
    </Link>
  );
}
