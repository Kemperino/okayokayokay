"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

import ContractStatusBadge from "./ContractStatusBadge";
import { useEffect, useState } from "react";
import type { RequestBatchData } from "@/lib/contracts/multicall-batch";
import CopyButton from "./CopyButton";

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
  batchData?: RequestBatchData;
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
  batchData,
}: ResourceRequestCardProps) {
  const description = getSellerDescription(request.seller_description);
  const params = request.input_data?.params || {};
  const path = request.input_data?.path || request.resource_url || "Unknown";

  const nextDeadline = batchData?.nextDeadline ?? null;
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (nextDeadline === null) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = nextDeadline - now;
      setCountdown(formatCountdown(secondsRemaining));
    };

    updateCountdown();

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
            statusLabel={batchData?.statusLabel || "Loading..."}
            hasStatus={batchData?.hasStatus || false}
            loading={!batchData}
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
            <CopyButton 
              value={request.user_address}
              label="User:"
              showFullValue={true}
            />
          </div>
        )}

        {request.seller_address && (
          <div>
            <CopyButton 
              value={request.seller_address}
              label="Seller:"
              showFullValue={true}
            />
          </div>
        )}

        {request.tx_hash && (
          <div>
            <CopyButton 
              value={request.tx_hash}
              label="Tx:"
              showFullValue={true}
            />
          </div>
        )}

        {request.escrow_contract_address && (
          <div>
            <CopyButton 
              value={request.escrow_contract_address}
              label="Escrow:"
              showFullValue={true}
            />
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
