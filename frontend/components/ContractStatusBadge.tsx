'use client';

import { useEffect, useState } from 'react';
import { getContractStatus, type ContractStatusResult } from '@/lib/actions/get-contract-status';

interface ContractStatusBadgeProps {
  requestId: string;
  escrowContractAddress: string | null;
}

export default function ContractStatusBadge({
  requestId,
  escrowContractAddress,
}: ContractStatusBadgeProps) {
  const [statusResult, setStatusResult] = useState<ContractStatusResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const result = await getContractStatus(requestId, escrowContractAddress);
        setStatusResult(result);
      } catch (error) {
        console.error('Failed to fetch contract status:', error);
        setStatusResult({
          status: null,
          statusLabel: 'Error',
          hasStatus: false,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [requestId, escrowContractAddress]);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 animate-pulse">
        Loading status...
      </div>
    );
  }

  if (!statusResult) {
    return null;
  }

  // Get color based on status label
  const getStatusColor = (label: string) => {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('escrowed')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (lowerLabel.includes('released')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (lowerLabel.includes('dispute opened')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (lowerLabel.includes('dispute escalated')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (lowerLabel.includes('resolved') || lowerLabel.includes('accepted')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }

    // Fallback/error states
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(statusResult.statusLabel)}`}>
      {statusResult.hasStatus ? (
        <span className="font-medium">{statusResult.statusLabel}</span>
      ) : (
        <span className="italic">{statusResult.statusLabel}</span>
      )}
    </div>
  );
}
