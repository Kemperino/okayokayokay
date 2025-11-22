'use client';

import ContractStatusBadge from './ContractStatusBadge';

interface ResourceRequest {
  request_id: string;
  user_address: string;
  seller_address: string;
  input_data: any;
  output_data: any | null;
  seller_description: any | null;
  tx_hash: string | null;
  resource_url: string | null;
  status: string;
  error_message: string | null;
  escrow_contract_address: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function MerchantResourceRequests({
  requests,
}: {
  requests: ResourceRequest[];
}) {

  if (!requests || requests.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No requests yet. When customers use your x402 resources, they will appear here.
      </div>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getSellerDescription = (sellerDescription: any): string | null => {
    if (!sellerDescription) return null;

    // Handle the x402 well-known format
    if (sellerDescription.accepts && Array.isArray(sellerDescription.accepts)) {
      const firstAccept = sellerDescription.accepts[0];
      return firstAccept?.description || null;
    }

    // Fallback for other formats
    if (typeof sellerDescription === 'string') {
      return sellerDescription;
    }

    return null;
  };

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const description = getSellerDescription(req.seller_description);
        const params = req.input_data?.params || {};
        const path = req.input_data?.path || req.resource_url || 'Unknown';

        return (
          <div
            key={`${req.request_id}-${req.user_address}`}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                {description && (
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    {description}
                  </div>
                )}
                <div className="text-sm text-gray-600 font-mono break-all">
                  {path}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end ml-3">
                <ContractStatusBadge
                  requestId={req.request_id}
                  escrowContractAddress={req.escrow_contract_address}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {params && Object.keys(params).length > 0 && (
                <div className="col-span-2">
                  <span className="font-semibold">Params:</span>{' '}
                  {Object.entries(params)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                </div>
              )}

              {req.user_address && (
                <div>
                  <span className="font-semibold">Buyer:</span>{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded">
                    {formatAddress(req.user_address)}
                  </code>
                </div>
              )}

              {req.tx_hash && (
                <div>
                  <span className="font-semibold">Tx:</span>{' '}
                  <a
                    href={`https://basescan.org/tx/${req.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    <code className="bg-gray-100 px-1 py-0.5 rounded">
                      {req.tx_hash.slice(0, 10)}...{req.tx_hash.slice(-8)}
                    </code>
                  </a>
                </div>
              )}

              {req.error_message && (
                <div className="col-span-2 text-red-600">
                  <span className="font-semibold">Error:</span> {req.error_message}
                </div>
              )}

              <div className="text-gray-500">
                <span className="font-semibold">Created:</span>{' '}
                {new Date(req.created_at).toLocaleString()}
              </div>

              {req.completed_at && (
                <div className="text-gray-500">
                  <span className="font-semibold">Completed:</span>{' '}
                  {new Date(req.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
