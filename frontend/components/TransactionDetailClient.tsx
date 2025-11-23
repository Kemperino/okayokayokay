'use client';

import { useState, useEffect } from 'react';
import DisputeActionButtons from './DisputeActionButtons';
import ContractStatusBadge from './ContractStatusBadge';

interface TransactionDetailClientProps {
  requestId: string;
  escrowContractAddress: string | null;
}

interface ContractStatusData {
  status: number | null;
  statusLabel: string;
  hasStatus: boolean;
  canOpen: boolean;
  canEscalate: boolean;
  canCancel: boolean;
}

export default function TransactionDetailClient({
  requestId,
  escrowContractAddress,
}: TransactionDetailClientProps) {
  const [statusData, setStatusData] = useState<ContractStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractStatus = async () => {
      if (!escrowContractAddress) {
        setLoading(false);
        return;
      }

      try {
        // Don't show loading spinner during polling (prevents flicker)
        if (refreshKey === 0) {
          setLoading(true);
        }

        const [statusRes, openRes, escalateRes, cancelRes] = await Promise.all([
          fetch(`/api/contract-status?requestId=${requestId}&escrowAddress=${escrowContractAddress}`),
          fetch(`/api/contract-status/can-open?requestId=${requestId}&escrowAddress=${escrowContractAddress}`),
          fetch(`/api/contract-status/can-escalate?requestId=${requestId}&escrowAddress=${escrowContractAddress}`),
          fetch(`/api/contract-status/can-cancel?requestId=${requestId}&escrowAddress=${escrowContractAddress}`),
        ]);

        const [status, canOpen, canEscalate, canCancel] = await Promise.all([
          statusRes.json(),
          openRes.json(),
          escalateRes.json(),
          cancelRes.json(),
        ]);

        const newStatusData = {
          status: status.status,
          statusLabel: status.statusLabel,
          hasStatus: status.hasStatus,
          canOpen: canOpen.can,
          canEscalate: canEscalate.can,
          canCancel: canCancel.can,
        };

        console.log('[TransactionDetail] Fetched status:', newStatusData);

        // Only update status data if not in pending state, or if status actually changed
        setStatusData(newStatusData);
      } catch (error) {
        console.error('Error fetching contract status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContractStatus();
  }, [requestId, escrowContractAddress, refreshKey]);

  const handleSuccess = (action: string) => {
    setPendingAction(action);
    
    // Poll for status updates with longer delays to avoid flickering
    // Base blockchain typically confirms in 2-3 seconds, so start polling at 4s
    const pollDelays = [4000, 6000, 8000, 12000, 16000]; // 4s, 6s, 8s, 12s, 16s
    
    pollDelays.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`[TransactionDetail] Polling attempt ${index + 1} after ${delay}ms`);
        setRefreshKey((prev) => prev + 1);
        
        // Clear pending state after last poll
        if (index === pollDelays.length - 1) {
          setTimeout(() => {
            setPendingAction(null);
          }, 1000); // Give one more second for final status update
        }
      }, delay);
    });
  };

  if (!escrowContractAddress) {
    return (
      <div className="bg-default border border-contrast rounded-lg p-6">
        <p className="text-sm text-primary/60">
          No escrow contract associated with this transaction.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-default border border-contrast rounded-lg p-6">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-primary">Loading contract status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show status badge only when NOT in pending state */}
      {!pendingAction && statusData && statusData.hasStatus && (
        <div className="bg-default border border-contrast rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary mb-3">Contract Status</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-primary/70">On-Chain Status:</span>
            <ContractStatusBadge
              requestId={requestId}
              escrowContractAddress={escrowContractAddress}
              key={refreshKey}
            />
          </div>
        </div>
      )}

      {/* Show pending banner when transaction is processing */}
      {pendingAction && (
        <div className="bg-highlight/20 border border-highlight rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-highlight" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-highlight">Transaction Pending</p>
              <p className="text-xs text-highlight/80">
                Waiting for blockchain confirmation... This may take up to 30 seconds.
                {pendingAction === 'open' && ' The Cancel Dispute button will become active after confirmation.'}
                {pendingAction === 'escalate' && ' The Cancel Dispute button will remain available after confirmation.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <DisputeActionButtons
        requestId={requestId}
        escrowAddress={escrowContractAddress}
        canOpen={
          pendingAction === 'open' || pendingAction === 'escalate' 
            ? false 
            : pendingAction === 'cancel' 
              ? false // After cancel, don't immediately show open (wait for confirmation)
              : (statusData?.canOpen ?? false)
        }
        canEscalate={
          pendingAction === 'escalate' 
            ? false 
            : pendingAction === 'open'
              ? false // After opening dispute, escalate isn't immediately available (seller must respond first)
              : (statusData?.canEscalate ?? false)
        }
        canCancel={
          pendingAction === 'cancel' 
            ? false 
            : pendingAction === 'open' || pendingAction === 'escalate'
              ? true // Optimistically show cancel after opening or escalating dispute
              : (statusData?.canCancel ?? false)
        }
        onSuccess={handleSuccess}
      />
    </div>
  );
}

