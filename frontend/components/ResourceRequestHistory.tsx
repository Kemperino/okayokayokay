"use client";

import ResourceRequestCard from "./ResourceRequestCard";
import type { RequestBatchData } from "@/lib/contracts/multicall-batch";

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

export default function ResourceRequestHistory({
  requests,
  batchData,
}: {
  requests: ResourceRequest[];
  batchData: Map<string, RequestBatchData>;
}) {
  if (!requests || requests.length === 0) {
    return (
      <div className="border border-contrast rounded-lg p-8 text-center text-primary/60">
        No requests yet. Test a resource above to see request history.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <ResourceRequestCard
          key={`${request.request_id}-${request.user_address}`}
          request={request}
          batchData={batchData.get(request.request_id)}
        />
      ))}
    </div>
  );
}
