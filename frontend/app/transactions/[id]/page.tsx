import { getResourceRequestById, getResourceByUrl } from "@/lib/queries/resources.server";
import Link from "next/link";
import { notFound } from "next/navigation";
import TransactionDetailClient from "@/components/TransactionDetailClient";
import ContractStatusBadgeClient from "@/components/ContractStatusBadgeClient";
import { batchGetRequestData } from "@/lib/contracts/multicall-batch";
import CopyableCode from "@/components/CopyableCode";

interface PageProps {
  params: Promise<{ id: string }>;
}

function extractBaseUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return null;
  }
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

function getPriceFromSellerDescription(sellerDescription: any): bigint | null {
  if (!sellerDescription) return null;

  if (sellerDescription.accepts && Array.isArray(sellerDescription.accepts)) {
    const firstAccept = sellerDescription.accepts[0];
    const maxAmount = firstAccept?.maxAmountRequired;
    
    if (typeof maxAmount === 'string') {
      try {
        return BigInt(maxAmount);
      } catch (e) {
        console.error('[TransactionDetail] Failed to parse maxAmountRequired:', maxAmount, e);
      }
    }
    if (typeof maxAmount === 'number') {
      return BigInt(maxAmount);
    }
  }

  if (sellerDescription.payment?.pricePerRequest) {
    const price = sellerDescription.payment.pricePerRequest;
    if (typeof price === 'number') {
      return BigInt(Math.floor(price * 1e6));
    }
    if (typeof price === 'string') {
      return BigInt(price);
    }
  }

  return null;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data: request, error } = await getResourceRequestById(id);

  if (error || !request) {
    notFound();
  }

  const batchData = await batchGetRequestData([
    {
      requestId: request.request_id,
      escrowContractAddress: request.escrow_contract_address,
    },
  ]);

  const statusData = batchData.get(request.request_id);

  const description = getSellerDescription(request.seller_description);
  let priceAmount = getPriceFromSellerDescription(request.seller_description);

  if (!priceAmount && request.resource_url) {
    const baseUrl = extractBaseUrl(request.resource_url);
    if (baseUrl) {
      const { data: resource } = await getResourceByUrl(baseUrl);
      if (resource?.price_per_request) {
        priceAmount = BigInt(Math.floor(resource.price_per_request * 1e6));
      }
    }
  }

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
        <div className="flex justify-between items-start gap-6 mb-6">
          <div className="flex-1 min-w-0">
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
            <div className="flex-shrink-0">
              <ContractStatusBadgeClient
                requestId={request.request_id}
                escrowContractAddress={request.escrow_contract_address}
                initialStatusLabel={statusData?.statusLabel || "Loading..."}
                initialHasStatus={statusData?.hasStatus || false}
              />
            </div>
          )}
        </div>

        {/* Request ID */}
        <div className="mb-4 pb-4 border-b border-contrast">
          <CopyableCode value={request.request_id} label="Request ID" />
        </div>

        {/* Grid of Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <CopyableCode value={request.user_address} label="User Address" />
          </div>

          {request.seller_address && (
            <div>
              <CopyableCode value={request.seller_address} label="Seller Address" />
            </div>
          )}

          {request.tx_hash && (
            <div className="lg:col-span-2">
              <CopyableCode value={request.tx_hash} label="Transaction Hash" />
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
        amount={priceAmount || statusData?.amount}
      />
    </div>
  );
}
