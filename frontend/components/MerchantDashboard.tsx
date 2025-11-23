'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import MerchantResourceRequests from './MerchantResourceRequests';
import { batchGetContractStatuses } from '@/lib/actions/get-contract-status';
import { RequestStatus } from '@/lib/contracts/DisputeEscrowABI';

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

interface StatusAggregation {
  total: number;
  escrowed: number;
  released: number;
  inDispute: number;
  resolved: number;
}

interface MerchantDashboardProps {
  contractAddress?: string;
}

export default function MerchantDashboard({ contractAddress }: MerchantDashboardProps) {
  const { address, isConnected } = useAccount();
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [activeRequests, setActiveRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusAggregation, setStatusAggregation] = useState<StatusAggregation>({
    total: 0,
    escrowed: 0,
    released: 0,
    inDispute: 0,
    resolved: 0,
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setRequests([]);
      setActiveRequests([]);
      setStatusAggregation({
        total: 0,
        escrowed: 0,
        released: 0,
        inDispute: 0,
        resolved: 0,
      });
      return;
    }

    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ seller: address });
        if (contractAddress) {
          params.append('contract', contractAddress);
        }

        const response = await fetch(`/api/merchant/transactions?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch requests');
        }

        const data = await response.json();
        const allRequests = data.transactions || [];
        setRequests(allRequests);
        setActiveRequests(data.active || []);

        // Fetch contract statuses for all requests and aggregate
        if (allRequests.length > 0) {
          const statusMap = await batchGetContractStatuses(
            allRequests.map((req: ResourceRequest) => ({
              requestId: req.request_id,
              escrowContractAddress: req.escrow_contract_address,
            }))
          );

          // Aggregate statuses
          const aggregation = {
            total: allRequests.length,
            escrowed: 0,
            released: 0,
            inDispute: 0,
            resolved: 0,
          };

          statusMap.forEach((result) => {
            if (result.hasStatus && result.status !== null) {
              switch (result.status) {
                case RequestStatus.Escrowed:
                  aggregation.escrowed++;
                  break;
                case RequestStatus.EscrowReleased:
                  aggregation.released++;
                  break;
                case RequestStatus.DisputeOpened:
                case RequestStatus.DisputeEscalated:
                  aggregation.inDispute++;
                  break;
                case RequestStatus.DisputeResolved:
                case RequestStatus.SellerAccepted:
                  aggregation.resolved++;
                  break;
              }
            }
          });

          setStatusAggregation(aggregation);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [address, isConnected, contractAddress]);

  if (!isConnected) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Loading your transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2 text-red-700">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - On-Chain Status Aggregation */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Sales</div>
          <div className="text-3xl font-bold text-gray-900">
            {statusAggregation.total}
          </div>
        </div>
        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">In Escrow</div>
          <div className="text-3xl font-bold text-blue-600">
            {statusAggregation.escrowed}
          </div>
          <div className="text-xs text-gray-500 mt-1">Funds held</div>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Released</div>
          <div className="text-3xl font-bold text-green-600">
            {statusAggregation.released}
          </div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white border border-orange-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">In Dispute</div>
          <div className="text-3xl font-bold text-orange-600">
            {statusAggregation.inDispute}
          </div>
          <div className="text-xs text-gray-500 mt-1">Under review</div>
        </div>
        <div className="bg-white border border-purple-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Resolved</div>
          <div className="text-3xl font-bold text-purple-600">
            {statusAggregation.resolved}
          </div>
          <div className="text-xs text-gray-500 mt-1">Disputes settled</div>
        </div>
      </div>

      {/* Active Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Active Requests</h2>
          {activeRequests.length > 0 && (
            <span className="text-sm text-gray-600">
              {activeRequests.length} active
            </span>
          )}
        </div>
        {activeRequests.length > 0 ? (
          <MerchantResourceRequests requests={activeRequests} />
        ) : (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            No active requests
          </div>
        )}
      </div>

      {/* All Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">All Sales</h2>
          {requests.length > 0 && (
            <span className="text-sm text-gray-600">
              {requests.length} total
            </span>
          )}
        </div>
        {requests.length > 0 ? (
          <MerchantResourceRequests requests={requests} />
        ) : (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            No requests yet. When customers use your x402 resources, they will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
