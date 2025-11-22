'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import MerchantResourceRequests from './MerchantResourceRequests';

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

interface MerchantDashboardProps {
  contractAddress?: string;
}

export default function MerchantDashboard({ contractAddress }: MerchantDashboardProps) {
  const { address, isConnected } = useAccount();
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [activeRequests, setActiveRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setRequests([]);
      setActiveRequests([]);
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
        setRequests(data.transactions || []);
        setActiveRequests(data.active || []);
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

  const completedCount = requests.filter(req => req.status === 'completed').length;
  const failedCount = requests.filter(req => req.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-gray-900">
            {requests.length}
          </div>
        </div>
        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Active/Pending</div>
          <div className="text-3xl font-bold text-blue-600">
            {activeRequests.length}
          </div>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-600">
            {completedCount}
          </div>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Failed</div>
          <div className="text-3xl font-bold text-red-600">
            {failedCount}
          </div>
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
          <MerchantResourceRequests
            requests={activeRequests}
            contractAddress={contractAddress}
          />
        ) : (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            No active requests
          </div>
        )}
      </div>

      {/* All Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">All Requests</h2>
          {requests.length > 0 && (
            <span className="text-sm text-gray-600">
              {requests.length} total
            </span>
          )}
        </div>
        {requests.length > 0 ? (
          <MerchantResourceRequests
            requests={requests}
            contractAddress={contractAddress}
          />
        ) : (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            No requests yet. When customers use your x402 resources, they will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
