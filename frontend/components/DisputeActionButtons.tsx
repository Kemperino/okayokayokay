'use client';

import { useState } from 'react';
import { getSessionId } from '@/lib/session-manager';

interface DisputeActionButtonsProps {
  requestId: string;
  escrowAddress: string | null;
  canOpen: boolean;
  canEscalate: boolean;
  canCancel: boolean;
  onSuccess?: (action: string) => void;
}

export default function DisputeActionButtons({
  requestId,
  escrowAddress,
  canOpen,
  canEscalate,
  canCancel,
  onSuccess,
}: DisputeActionButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!escrowAddress) {
    return null;
  }

  const handleOpenDispute = async () => {
    try {
      setLoading('open');
      setError(null);
      setTxHash(null);

      const sessionId = getSessionId();

      const response = await fetch('/api/disputes/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          requestId,
          escrowAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to open dispute');
      }

      setTxHash(data.transactionHash);
      onSuccess?.('open');
    } catch (err) {
      console.error('Error opening dispute:', err);
      setError(err instanceof Error ? err.message : 'Failed to open dispute');
    } finally {
      setLoading(null);
    }
  };

  const handleEscalateDispute = async () => {
    try {
      setLoading('escalate');
      setError(null);
      setTxHash(null);

      const sessionId = getSessionId();

      const response = await fetch('/api/disputes/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          requestId,
          escrowAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to escalate dispute');
      }

      setTxHash(data.transactionHash);
      onSuccess?.('escalate');
    } catch (err) {
      console.error('Error escalating dispute:', err);
      setError(err instanceof Error ? err.message : 'Failed to escalate dispute');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelDispute = async () => {
    if (!confirm('Are you sure you want to cancel this dispute? The funds will be released to the merchant.')) {
      return;
    }

    try {
      setLoading('cancel');
      setError(null);
      setTxHash(null);

      const sessionId = getSessionId();

      const response = await fetch('/api/disputes/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          requestId,
          escrowAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel dispute');
      }

      setTxHash(data.transactionHash);
      onSuccess?.('cancel');
    } catch (err) {
      console.error('Error cancelling dispute:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel dispute');
    } finally {
      setLoading(null);
    }
  };

  const hasAnyAction = canOpen || canEscalate || canCancel;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className="bg-default border border-contrast rounded-lg p-6">
      <h3 className="text-lg font-semibold text-primary mb-4">Available Actions</h3>

      <div className="flex flex-wrap gap-3 mb-4">
        {canOpen && (
          <button
            onClick={handleOpenDispute}
            disabled={loading !== null}
            className="px-4 py-2 bg-warning text-background font-medium rounded hover:bg-warning/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'open' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Opening...
              </span>
            ) : (
              'Open Dispute'
            )}
          </button>
        )}

        {canEscalate && (
          <button
            onClick={handleEscalateDispute}
            disabled={loading !== null}
            className="px-4 py-2 bg-error text-background font-medium rounded hover:bg-error/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'escalate' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Escalating...
              </span>
            ) : (
              'Escalate to Agent'
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancelDispute}
            disabled={loading !== null}
            className="px-4 py-2 bg-contrast text-primary font-medium rounded hover:bg-contrast/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'cancel' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Cancelling...
              </span>
            ) : (
              'Cancel Dispute'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error/20 border border-error rounded p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-error">Error</p>
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      {txHash && (
        <div className="bg-success/20 border border-success rounded p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-success mb-1">Transaction Submitted</p>
              <p className="text-xs text-success/80 mb-2">
                Your transaction has been sent to the blockchain. It may take a few moments to confirm.
              </p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-success underline hover:text-success/80 font-mono break-all"
              >
                {txHash}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-primary/60">
        <p className="font-semibold mb-1">About Dispute Actions:</p>
        <ul className="list-disc list-inside space-y-1">
          {canOpen && (
            <li>Opening a dispute will freeze the funds and notify the merchant</li>
          )}
          {canEscalate && (
            <li>Escalating will send the dispute to an independent agent for review</li>
          )}
          {canCancel && (
            <li>Cancelling will release the funds to the merchant immediately</li>
          )}
        </ul>
      </div>
    </div>
  );
}

