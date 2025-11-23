'use client';

import { useEffect, useState } from 'react';
import ContractStatusBadge from './ContractStatusBadge';

/**
 * ContractStatusBadgeClient - Pure event listener for status updates
 * 
 * Synchronization Strategy:
 * - Fetches initial status once on mount for immediate display
 * - Listens to 'contract-status-update' events from TransactionDetailClient
 * - Does NOT poll independently - single source of truth ensures consistency
 * - Always stays in perfect sync with TransactionDetailClient polling
 */

interface ContractStatusBadgeClientProps {
  requestId: string;
  escrowContractAddress: string | null;
  initialStatusLabel?: string;
  initialHasStatus?: boolean;
}

export default function ContractStatusBadgeClient({
  requestId,
  escrowContractAddress,
  initialStatusLabel = 'Loading...',
  initialHasStatus = false,
}: ContractStatusBadgeClientProps) {
  const [statusLabel, setStatusLabel] = useState(initialStatusLabel);
  const [hasStatus, setHasStatus] = useState(initialHasStatus);
  const [loading, setLoading] = useState(!initialStatusLabel);
  const [buyerRefunded, setBuyerRefunded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!escrowContractAddress) return;

    let isInitialized = false;

    const fetchInitialStatus = async () => {
      try {
        const res = await fetch(
          `/api/contract-status?requestId=${requestId}&escrowAddress=${escrowContractAddress}`
        );
        const data = await res.json();
        
        if (!isInitialized) {
          setStatusLabel(data.statusLabel);
          setHasStatus(data.hasStatus);
          setBuyerRefunded(data.buyerRefunded);
          setLoading(false);
          isInitialized = true;
        }
      } catch (error) {
        console.error('[ContractStatusBadgeClient] Error fetching initial status:', error);
        setLoading(false);
      }
    };

    fetchInitialStatus();
  }, [requestId, escrowContractAddress]);

  useEffect(() => {
    const handleStatusUpdate = ((event: CustomEvent) => {
      const { 
        requestId: eventRequestId, 
        statusLabel: newStatusLabel, 
        hasStatus: newHasStatus,
        buyerRefunded: newBuyerRefunded 
      } = event.detail;
      
      if (eventRequestId === requestId) {
        console.log('[ContractStatusBadgeClient] Syncing with TransactionDetailClient:', event.detail);
        setStatusLabel(newStatusLabel);
        setHasStatus(newHasStatus);
        setBuyerRefunded(newBuyerRefunded);
        setLoading(false);
      }
    }) as EventListener;

    window.addEventListener('contract-status-update', handleStatusUpdate);

    return () => {
      window.removeEventListener('contract-status-update', handleStatusUpdate);
    };
  }, [requestId]);

  return (
    <ContractStatusBadge
      statusLabel={statusLabel}
      hasStatus={hasStatus}
      loading={loading}
      buyerRefunded={buyerRefunded}
    />
  );
}

