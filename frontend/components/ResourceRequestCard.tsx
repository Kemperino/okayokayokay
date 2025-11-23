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
  resource_name?: string | null;
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

// Truncate address or hash to show first N and last M characters
const truncateAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export default function ResourceRequestCard({
  request,
  batchData,
}: ResourceRequestCardProps) {
  const description = getSellerDescription(request.seller_description);
  const params = request.input_data?.params || {};
  const resourceName = request.resource_name || request.input_data?.path || request.resource_url || "Unknown";

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
      <div className="flex items-center w-full justify-between gap-2 mb-2">
        <div className="text-primary/50 text-xs">
          {new Date(request.created_at).toLocaleString()}
        </div>
        {countdown && (
          <div className="flex items-center gap-2 text-xs text-red-500">
            <Clock size={14} className="" />
            <span className="font-semibold ">Next Deadline:</span>
            <span className=" font-mono text-red-500">{countdown}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-primary mb-1">
            {resourceName}
          </div>
          {description && (
            <div className="text-xs text-primary/60">
              {description}
            </div>
          )}
          <div className="text-sm text-blue-500 font-mono break-all">
            {request.input_data?.path}
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
        <div className="flex items-center gap-2">
          {params && Object.keys(params).length > 0 && (
            <div>
              <span className="font-semibold text-primary/80">Params:</span>{" "}
              {Object.entries(params)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
          {request.user_address && (
            <div className="min-w-0">
              <CopyButton
                value={request.user_address}
                label="User:"
                showFullValue={false}
                className="w-full"
              />
            </div>
          )}

          {request.seller_address && (
            <div className="min-w-0">
              <CopyButton
                value={request.seller_address}
                label="Seller:"
                showFullValue={false}
                className="w-full"
              />
            </div>
          )}

          {request.tx_hash && (
            <div className="min-w-0">
              <CopyButton
                value={request.tx_hash}
                label="Tx:"
                showFullValue={false}
                className="w-full"
              />
            </div>
          )}

          {request.escrow_contract_address && (
            <div className="min-w-0">
              <CopyButton
                value={request.escrow_contract_address}
                label="Escrow:"
                showFullValue={false}
                className="w-full"
              />
            </div>
          )}
        </div>

        {request.error_message && (
          <div className="text-error">
            <span className="font-semibold">Error:</span>{" "}
            {request.error_message}
          </div>
        )}
      </div>
    </Link>
  );
}
