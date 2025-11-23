'use client';

import { useEffect, useState } from 'react';
import { getRequestDetailsWithMetadata } from '@/lib/contracts/status-queries';
import { getStatusDescription } from '@/lib/contracts/types';
import { RequestStatus } from '@/lib/contracts/DisputeEscrowABI';
import type { Hex, Address } from 'viem';
import type { ServiceRequestWithMetadata } from '@/lib/contracts/types';

interface RequestActionsPanelProps {
  requestId: string;
  escrowContractAddress: string | null;
  ActionsComponent?: React.ComponentType<{
    requestId: string;
    escrowContractAddress: string | null;
    contractStatus: RequestStatus | null;
    canOpenDispute: boolean;
    canEscalateDispute: boolean;
    canSellerRespond: boolean;
    canReleaseEscrow: boolean;
    onActionComplete?: () => void;
  }>;
  onActionComplete?: () => void;
}

export default function RequestActionsPanel({
  requestId,
  escrowContractAddress,
  ActionsComponent,
  onActionComplete,
}: RequestActionsPanelProps) {
  const [requestDetails, setRequestDetails] = useState<ServiceRequestWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      if (!escrowContractAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const requestIdHex = requestId.startsWith('0x') ? (requestId as Hex) : (`0x${requestId}` as Hex);
        const details = await getRequestDetailsWithMetadata(
          requestIdHex,
          escrowContractAddress as Address
        );
        setRequestDetails(details);
      } catch (error) {
        console.error('Failed to fetch request details:', error);
        setRequestDetails(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [requestId, escrowContractAddress]);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 animate-pulse">
        Loading...
      </div>
    );
  }

  if (!requestDetails || !escrowContractAddress) {
    return (
      <div className="text-xs text-gray-500 italic">
        No escrow
      </div>
    );
  }

  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const statusDescription = getStatusDescription(requestDetails, currentTime);

  // Get color based on status
  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Escrowed:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case RequestStatus.EscrowReleased:
        return 'bg-green-100 text-green-800 border-green-200';
      case RequestStatus.DisputeOpened:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case RequestStatus.DisputeEscalated:
        return 'bg-red-100 text-red-800 border-red-200';
      case RequestStatus.SellerAccepted:
      case RequestStatus.DisputeResolved:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(requestDetails.status)}`}>
        <span className="font-medium">{statusDescription}</span>
      </div>

      {ActionsComponent && (
        <ActionsComponent
          requestId={requestId}
          escrowContractAddress={escrowContractAddress}
          contractStatus={requestDetails.status}
          canOpenDispute={requestDetails.canOpenDispute}
          canEscalateDispute={requestDetails.canEscalateDispute}
          canSellerRespond={requestDetails.canSellerRespond}
          canReleaseEscrow={requestDetails.canReleaseEscrow}
          onActionComplete={onActionComplete}
        />
      )}
    </div>
  );
}
