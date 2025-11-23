"use client";

import { useState } from "react";
import { getSessionId } from "@/lib/session-manager";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

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
  const [confirming, setConfirming] = useState(false);

  if (!escrowAddress) {
    return null;
  }

  const waitForTransaction = async (hash: `0x${string}`) => {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    });

    setConfirming(true);
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      return receipt;
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenDispute = async () => {
    try {
      setLoading("open");
      setError(null);
      setTxHash(null);

      const sessionId = getSessionId();

      const response = await fetch("/api/disputes/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          requestId,
          escrowAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to open dispute");
      }

      setTxHash(data.transactionHash);

      await waitForTransaction(data.transactionHash);
      onSuccess?.("open");
    } catch (err) {
      console.error("Error opening dispute:", err);
      setError(err instanceof Error ? err.message : "Failed to open dispute");
    } finally {
      setLoading(null);
    }
  };

  const handleEscalateDispute = async () => {
    try {
      setLoading("escalate");
      setError(null);
      setTxHash(null);

      const sessionId = getSessionId();

      const response = await fetch("/api/disputes/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          requestId,
          escrowAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to escalate dispute");
      }

      setTxHash(data.transactionHash);

      await waitForTransaction(data.transactionHash);
      onSuccess?.("escalate");
    } catch (err) {
      console.error("Error escalating dispute:", err);
      setError(
        err instanceof Error ? err.message : "Failed to escalate dispute"
      );
    } finally {
      setLoading(null);
    }
  };

  const handleCancelDispute = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel this dispute? The funds will be released to the merchant."
      )
    ) {
      return;
    }

    try {
      setLoading("cancel");
      setError(null);
      setTxHash(null);

      const sessionId = getSessionId();

      const response = await fetch("/api/disputes/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          requestId,
          escrowAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel dispute");
      }

      setTxHash(data.transactionHash);

      await waitForTransaction(data.transactionHash);
      onSuccess?.("cancel");
    } catch (err) {
      console.error("Error cancelling dispute:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel dispute");
    } finally {
      setLoading(null);
    }
  };

  const hasAnyAction = canOpen || canEscalate || canCancel;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className="bg-default/20 backdrop-blur-sm border border-contrast rounded-lg p-6 fixed left-1/2 -translate-x-1/2 bottom-5 items-center justify-center flex flex-col">
      <div className="flex flex-wrap gap-3">
        {canOpen && (
          <button
            onClick={handleOpenDispute}
            disabled={loading !== null}
            className="px-4 py-2 bg-warning text-background font-medium rounded hover:bg-warning/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "open" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Opening...
              </span>
            ) : (
              "Open Dispute"
            )}
          </button>
        )}

        {canEscalate && (
          <button
            onClick={handleEscalateDispute}
            disabled={loading !== null}
            className="px-4 py-2 bg-error text-background font-medium rounded hover:bg-error/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "escalate" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Escalating...
              </span>
            ) : (
              "Escalate to Agent"
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancelDispute}
            disabled={loading !== null}
            className="px-4 py-2 bg-contrast text-primary font-medium rounded hover:bg-contrast/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "cancel" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Cancelling...
              </span>
            ) : (
              "Cancel Dispute"
            )}
          </button>
        )}

        <button
          // TODO: Implement butoon click
          disabled={loading !== null}
          className="px-4 py-2 bg-success text-background font-medium rounded hover:bg-success/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "open" ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Opening...
            </span>
          ) : (
            "Release Escrow"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-error/20 border border-error rounded p-3">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-error">Error</p>
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      {txHash && (
        <div
          className={
            confirming
              ? "bg-highlight/20 border border-highlight rounded p-3"
              : "bg-success/20 border border-success rounded p-3"
          }
        >
          <div className="flex items-start gap-2">
            {confirming ? (
              <svg
                className="animate-spin h-5 w-5 text-highlight flex-shrink-0 mt-0.5"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-success flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold mb-1 ${
                  confirming ? "text-highlight" : "text-success"
                }`}
              >
                {confirming
                  ? "Confirming Transaction..."
                  : "Transaction Confirmed"}
              </p>
              <p
                className={`text-xs mb-2 ${
                  confirming ? "text-highlight/80" : "text-success/80"
                }`}
              >
                {confirming
                  ? "Waiting for blockchain confirmation..."
                  : "Your transaction has been confirmed on the blockchain."}
              </p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs underline font-mono break-all ${
                  confirming
                    ? "text-highlight hover:text-highlight/80"
                    : "text-success hover:text-success/80"
                }`}
              >
                {txHash}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
