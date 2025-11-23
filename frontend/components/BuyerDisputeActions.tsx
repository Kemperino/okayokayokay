'use client';

import { useState } from 'react';
import { fileDispute, escalateDisputeAction, earlyReleaseAction } from '@/lib/actions/dispute-actions';
import { getOrCreateSessionId } from '@/lib/session-manager';
import { RequestStatus } from '@/lib/contracts/DisputeEscrowABI';

interface BuyerDisputeActionsProps {
  requestId: string;
  escrowContractAddress: string | null;
  contractStatus: RequestStatus | null;
  canOpenDispute: boolean;
  canEscalateDispute: boolean;
  onActionComplete?: () => void;
}

export default function BuyerDisputeActions({
  requestId,
  escrowContractAddress,
  contractStatus,
  canOpenDispute,
  canEscalateDispute,
  onActionComplete,
}: BuyerDisputeActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!escrowContractAddress) {
    return null;
  }

  const handleFileDispute = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const sessionId = getOrCreateSessionId();
      const result = await fileDispute(sessionId, requestId, escrowContractAddress);

      if (result.success) {
        setSuccess('Dispute filed successfully!');
        onActionComplete?.();
      } else {
        setError(result.error || 'Failed to file dispute');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const sessionId = getOrCreateSessionId();
      const result = await escalateDisputeAction(sessionId, requestId, escrowContractAddress);

      if (result.success) {
        setSuccess('Dispute escalated to agent!');
        onActionComplete?.();
      } else {
        setError(result.error || 'Failed to escalate dispute');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleEarlyRelease = async () => {
    if (!confirm('Are you satisfied with this service? This will release payment to the merchant immediately.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const sessionId = getOrCreateSessionId();
      const result = await earlyReleaseAction(sessionId, requestId, escrowContractAddress);

      if (result.success) {
        setSuccess('Payment released to merchant!');
        onActionComplete?.();
      } else {
        setError(result.error || 'Failed to release payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Only show early release for Escrowed status
  const canEarlyRelease = contractStatus === RequestStatus.Escrowed;

  // Don't show any actions if request is already resolved
  if (
    contractStatus === RequestStatus.EscrowReleased ||
    contractStatus === RequestStatus.SellerAccepted ||
    contractStatus === RequestStatus.DisputeResolved
  ) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
          {success}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {canOpenDispute && (
          <button
            onClick={handleFileDispute}
            disabled={loading}
            className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Filing...' : 'File Dispute'}
          </button>
        )}

        {canEscalateDispute && (
          <button
            onClick={handleEscalate}
            disabled={loading}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Escalating...' : 'Escalate to Agent'}
          </button>
        )}

        {canEarlyRelease && (
          <button
            onClick={handleEarlyRelease}
            disabled={loading}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Releasing...' : 'Release Payment (Satisfied)'}
          </button>
        )}
      </div>
    </div>
  );
}
