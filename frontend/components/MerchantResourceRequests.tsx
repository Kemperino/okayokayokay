'use client';

import { useEffect, useState } from 'react';
import { type Hex } from 'viem';
import {
  getRequestStatusFromContract,
  toRequestIdHex,
} from '@/lib/contracts/DisputeEscrowContract';
import { RequestStatus, RequestStatusLabels } from '@/lib/contracts/DisputeEscrowABI';

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
  created_at: string;
  completed_at: string | null;
}

interface RequestWithContractStatus extends ResourceRequest {
  contractStatus?: RequestStatus | null;
  contractStatusLabel?: string;
  isLoadingContractStatus?: boolean;
}

export default function MerchantResourceRequests({
  requests,
  contractAddress,
}: {
  requests: ResourceRequest[];
  contractAddress?: string;
}) {
  const [requestsWithStatus, setRequestsWithStatus] = useState<
    RequestWithContractStatus[]
  >(requests);

  useEffect(() => {
    // Fetch on-chain status for each request
    const fetchContractStatuses = async () => {
      const updatedRequests = await Promise.all(
        requests.map(async (req) => {
          try {
            const requestIdHex = toRequestIdHex(req.request_id);
            const contractStatus = await getRequestStatusFromContract(
              requestIdHex,
              contractAddress as Hex | undefined
            );

            return {
              ...req,
              contractStatus,
              contractStatusLabel: contractStatus !== null
                ? RequestStatusLabels[contractStatus]
                : 'Unknown',
              isLoadingContractStatus: false,
            };
          } catch (error) {
            console.error('Error fetching contract status:', error);
            return {
              ...req,
              contractStatus: null,
              contractStatusLabel: 'Error',
              isLoadingContractStatus: false,
            };
          }
        })
      );

      setRequestsWithStatus(updatedRequests);
    };

    if (requests.length > 0) {
      fetchContractStatuses();
    }
  }, [requests, contractAddress]);

  if (!requests || requests.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No requests yet. When customers use your x402 resources, they will appear here.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      {requestsWithStatus.map((req) => {
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
              <div className="flex flex-col gap-1 items-end ml-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(
                    req.status
                  )}`}
                >
                  DB: {req.status.toUpperCase()}
                </span>
                {req.contractStatusLabel && (
                  <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-indigo-100 text-indigo-800">
                    Chain: {req.contractStatusLabel}
                  </span>
                )}
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
