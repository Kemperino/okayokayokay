"use client";

import Link from "next/link";

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

export default function ResourceRequestCard({
  request,
}: ResourceRequestCardProps) {
  const description = getSellerDescription(request.seller_description);
  const params = request.input_data?.params || {};
  const path = request.input_data?.path || request.resource_url || "Unknown";

  const [nextDeadline, setNextDeadline] = useState<any | null>(null);

  const fetchNextDeadline = async () => {
    const newNextDeadline = await getContractNextDeadline(
      request.request_id,
      request.escrow_contract_address
    );
    setNextDeadline(newNextDeadline);
  };

  useEffect(() => {
    fetchNextDeadline();
  }, []);

  console.log("nextDeadline", nextDeadline);

  return (
    <Link
      href={`/transactions/${request.request_id}`}
      className="block border border-contrast rounded-lg p-4 bg-default shadow-sm hover:shadow hover:border-highlight transition cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {description && (
            <div className="text-sm font-semibold text-primary mb-1">
              {description}
            </div>
          )}
          <div className="text-sm text-primary/70 font-mono break-all">
            {path}
          </div>
        </div>
        <div className="ml-3">
          <ContractStatusBadge
            requestId={request.request_id}
            escrowContractAddress={request.escrow_contract_address}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-primary/70">
        {params && Object.keys(params).length > 0 && (
          <div className="col-span-2">
            <span className="font-semibold text-primary/80">Params:</span>{" "}
            {Object.entries(params)
              .map(([k, v]) => `${k}=${v}`)
              .join(", ")}
          </div>
        )}

        {request.seller_address && (
          <div className="col-span-2">
            <span className="font-semibold text-primary/80">Seller:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-xs text-primary">
              {request.seller_address.slice(0, 8)}...
              {request.seller_address.slice(-6)}
            </code>
          </div>
        )}

        {request.tx_hash && (
          <div className="col-span-2">
            <span className="font-semibold text-primary/80">Tx:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-primary">
              {request.tx_hash.slice(0, 10)}...{request.tx_hash.slice(-8)}
            </code>
          </div>
        )}

        {request.escrow_contract_address && (
          <div className="col-span-2">
            <span className="font-semibold">Escrow:</span>{" "}
            <code className="bg-contrast px-1 py-0.5 rounded text-xs text-primary">
              {request.escrow_contract_address.slice(0, 8)}...
              {request.escrow_contract_address.slice(-6)}
            </code>
          </div>
        )}

        {request.error_message && (
          <div className="col-span-2 text-error">
            <span className="font-semibold">Error:</span>{" "}
            {request.error_message}
          </div>
        )}

        <div className="col-span-2 text-primary/50">
          {new Date(request.created_at).toLocaleString()}
        </div>
      </div>
    </Link>
  );
}
