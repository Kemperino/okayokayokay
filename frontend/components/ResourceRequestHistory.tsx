'use client';

import ContractStatusBadge from './ContractStatusBadge';

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
}: {
  requests: ResourceRequest[];
}) {
  if (!requests || requests.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No requests yet. Test a resource above to see request history.
      </div>
    );
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
    if (typeof sellerDescription === 'string') {
      return sellerDescription;
    }

    return null;
  };

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const description = getSellerDescription(request.seller_description);
        const params = request.input_data?.params || {};
        const path = request.input_data?.path || request.resource_url || 'Unknown';

        return (
          <div
            key={`${request.request_id}-${request.user_address}`}
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
              <div className="ml-3">
                <ContractStatusBadge
                  requestId={request.request_id}
                  escrowContractAddress={request.escrow_contract_address}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {params && Object.keys(params).length > 0 && (
                <div className="col-span-2">
                  <span className="font-semibold">Params:</span>{' '}
                  {Object.entries(params)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                </div>
              )}

              {request.seller_address && (
                <div className="col-span-2">
                  <span className="font-semibold">Seller:</span>{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                    {request.seller_address.slice(0, 8)}...{request.seller_address.slice(-6)}
                  </code>
                </div>
              )}

              {request.tx_hash && (
                <div className="col-span-2">
                  <span className="font-semibold">Tx:</span>{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded">
                    {request.tx_hash.slice(0, 10)}...{request.tx_hash.slice(-8)}
                  </code>
                </div>
              )}

              {request.escrow_contract_address && (
                <div className="col-span-2">
                  <span className="font-semibold">Escrow:</span>{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                    {request.escrow_contract_address.slice(0, 8)}...
                    {request.escrow_contract_address.slice(-6)}
                  </code>
                </div>
              )}

              {request.error_message && (
                <div className="col-span-2 text-red-600">
                  <span className="font-semibold">Error:</span> {request.error_message}
                </div>
              )}

              <div className="col-span-2 text-gray-500">
                {new Date(request.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
