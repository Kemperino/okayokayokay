import { getResourceRequestById } from "@/lib/queries/resources.server";
import Link from "next/link";
import { notFound } from "next/navigation";
import TransactionDetailClient from "@/components/TransactionDetailClient";
import ContractStatusBadge from "@/components/ContractStatusBadge";

interface PageProps {
  params: Promise<{ id: string }>;
}


function getSellerDescription(sellerDescription: any): string | null {
  if (!sellerDescription) return null;

  if (sellerDescription.accepts && Array.isArray(sellerDescription.accepts)) {
    const firstAccept = sellerDescription.accepts[0];
    return firstAccept?.description || null;
  }

  if (typeof sellerDescription === "string") {
    return sellerDescription;
  }

  return null;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data: request, error } = await getResourceRequestById(id);

  if (error || !request) {
    notFound();
  }

  const description = getSellerDescription(request.seller_description);
  const params_data = request.input_data?.params || {};
  const path = request.input_data?.path || request.resource_url || "Unknown";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/disputes"
          className="text-sm text-primary/70 hover:text-primary flex items-center gap-2"
        >
          ← Back to Transactions
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-primary">
          Transaction Details
        </h1>
        <p className="text-primary/70">
          View request and response details for this transaction
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-default border border-contrast rounded-lg p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {description && (
              <h2 className="text-xl font-semibold text-primary mb-2">
                {description}
              </h2>
            )}
            <div className="text-sm text-primary/70 font-mono break-all">
              {path}
            </div>
          </div>
          {request.escrow_contract_address && (
            <div className="ml-3">
              <ContractStatusBadge
                requestId={request.request_id}
                escrowContractAddress={request.escrow_contract_address}
              />
            </div>
          )}
        </div>

        {/* Request ID */}
        <div className="mb-4 pb-4 border-b border-contrast">
          <label className="text-sm font-semibold text-primary/80 block mb-1">
            Request ID
          </label>
          <code className="text-xs bg-contrast px-3 py-2 rounded block font-mono break-all text-primary">
            {request.request_id}
          </code>
        </div>

        {/* Grid of Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-semibold text-primary/80 block mb-1">
              User Address
            </label>
            <code className="text-xs bg-contrast px-2 py-1 rounded font-mono text-primary">
              {request.user_address.slice(0, 10)}...
              {request.user_address.slice(-8)}
            </code>
          </div>

          {request.seller_address && (
            <div>
              <label className="text-sm font-semibold text-primary/80 block mb-1">
                Seller Address
              </label>
              <code className="text-xs bg-contrast px-2 py-1 rounded font-mono text-primary">
                {request.seller_address.slice(0, 10)}...
                {request.seller_address.slice(-8)}
              </code>
            </div>
          )}

          {request.tx_hash && (
            <div>
              <label className="text-sm font-semibold text-primary/80 block mb-1">
                Transaction Hash
              </label>
              <code className="text-xs bg-contrast px-2 py-1 rounded font-mono text-primary break-all">
                {request.tx_hash}
              </code>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-primary/80 block mb-1">
              Created At
            </label>
            <span className="text-sm text-primary/70">
              {new Date(request.created_at).toLocaleString()}
            </span>
          </div>

          {request.completed_at && (
            <div>
              <label className="text-sm font-semibold text-primary/80 block mb-1">
                Completed At
              </label>
              <span className="text-sm text-primary/70">
                {new Date(request.completed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Parameters */}
        {params_data && Object.keys(params_data).length > 0 && (
          <div className="mb-4 pb-4 border-b border-contrast">
            <label className="text-sm font-semibold text-primary/80 block mb-2">
              Request Parameters
            </label>
            <div className="bg-contrast rounded p-3">
              <pre className="text-xs text-primary font-mono overflow-x-auto">
                {JSON.stringify(params_data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Error Message */}
        {request.error_message && (
          <div className="mb-4 pb-4 border-b border-contrast">
            <label className="text-sm font-semibold text-error block mb-2">
              Error Message
            </label>
            <div className="bg-error/20 border border-error rounded p-3">
              <p className="text-sm text-error font-mono whitespace-pre-wrap break-words">
                {request.error_message}
              </p>
            </div>
          </div>
        )}

        {/* Response Data */}
        {request.output_data && (
          <div>
            <label className="text-sm font-semibold text-primary/80 block mb-2">
              Response Data
            </label>
            <div className="bg-contrast rounded p-3">
              <pre className="text-xs text-primary font-mono overflow-x-auto whitespace-pre-wrap break-words">
                {typeof request.output_data === "string"
                  ? request.output_data
                  : JSON.stringify(request.output_data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Dispute Actions */}
      <TransactionDetailClient
        requestId={request.request_id}
        escrowContractAddress={request.escrow_contract_address}
      />
    </div>
  );
}
