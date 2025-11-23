"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import DisputeActionButtons from "./DisputeActionButtons";
import ContractStatusBadge from "./ContractStatusBadge";
import MoneyFlowDiagram from "./MoneyFlowDiagram";
import { getContractNextDeadline } from "@/lib/actions/get-contract-status";

/**
 * TransactionDetailClient - Single source of truth for contract status
 *
 * Adaptive Polling Strategy:
 * - Starts at 1000ms (1 second) intervals
 * - When status changes detected: switches to 500ms (0.5 second) for 10 seconds
 * - After user transaction: switches to 500ms for 10 seconds
 * - After fast period: slows down to 2000ms (2 seconds)
 * - Broadcasts all updates via 'contract-status-update' custom events
 * - All status badges listen to these events for perfect synchronization
 */

interface TransactionDetailClientProps {
  requestId: string;
  escrowContractAddress: string | null;
  amount?: bigint;
  resourceUrl?: string | null;
}

interface ContractStatusData {
  status: number | null;
  statusLabel: string;
  hasStatus: boolean;
  canOpen: boolean;
  canEscalate: boolean;
  canCancel: boolean;
  buyerRefunded?: boolean;
  amount?: bigint;
}

// Format countdown time remaining
const formatCountdown = (secondsRemaining: number): string => {
  if (secondsRemaining <= 0) {
    return "Deadline passed";
  }

  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
};

export default function TransactionDetailClient({
  requestId,
  escrowContractAddress,
  amount,
  resourceUrl,
}: TransactionDetailClientProps) {
  const [statusData, setStatusData] = useState<ContractStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [nextDeadline, setNextDeadline] = useState<bigint | number | null>(
    null
  );
  const [countdown, setCountdown] = useState<string>("");
  const [pollInterval, setPollInterval] = useState(1000);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [fetchedAmount, setFetchedAmount] = useState<bigint | null>(null);

  useEffect(() => {
    if (!escrowContractAddress) {
      setLoading(false);
      return;
    }

    let isActive = true;
    let timeoutId: NodeJS.Timeout;

    const fetchContractStatus = async () => {
      if (!isActive) return;

      try {
        const [statusRes, openRes, escalateRes, cancelRes] = await Promise.all([
          fetch(
            `/api/contract-status?requestId=${requestId}&escrowAddress=${escrowContractAddress}`
          ),
          fetch(
            `/api/contract-status/can-open?requestId=${requestId}&escrowAddress=${escrowContractAddress}`
          ),
          fetch(
            `/api/contract-status/can-escalate?requestId=${requestId}&escrowAddress=${escrowContractAddress}`
          ),
          fetch(
            `/api/contract-status/can-cancel?requestId=${requestId}&escrowAddress=${escrowContractAddress}`
          ),
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
          buyerRefunded: status.buyerRefunded,
          amount: status.amount ? BigInt(status.amount) : undefined,
        };

        if (!isActive) return;

        const statusChanged =
          lastStatus !== null && lastStatus !== newStatusData.status;

        if (statusChanged) {
          console.log("[TransactionDetail] Status changed!", {
            old: lastStatus,
            new: newStatusData.status,
            label: newStatusData.statusLabel,
          });
          setPollInterval(500);
        }

        setLastStatus(newStatusData.status);
        setStatusData(newStatusData);
        setLoading(false);

        window.dispatchEvent(
          new CustomEvent("contract-status-update", {
            detail: {
              requestId,
              statusLabel: newStatusData.statusLabel,
              hasStatus: newStatusData.hasStatus,
              status: newStatusData.status,
              buyerRefunded: newStatusData.buyerRefunded,
            },
          })
        );

        if (isActive) {
          timeoutId = setTimeout(fetchContractStatus, pollInterval);
        }
      } catch (error) {
        console.error(
          "[TransactionDetail] Error fetching contract status:",
          error
        );
        if (isActive) {
          timeoutId = setTimeout(fetchContractStatus, pollInterval);
        }
      }
    };

    setLoading(true);
    fetchContractStatus();

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [requestId, escrowContractAddress, pollInterval, lastStatus]);

  useEffect(() => {
    if (pollInterval === 500) {
      const slowDownTimer = setTimeout(() => {
        console.log("[TransactionDetail] Slowing down polling to 2000ms");
        setPollInterval(2000);
      }, 10000);

      return () => clearTimeout(slowDownTimer);
    }
  }, [pollInterval]);

  useEffect(() => {
    if (!escrowContractAddress) return;

    let isActive = true;

    const fetchNextDeadline = async () => {
      if (!isActive) return;

      const deadline = await getContractNextDeadline(
        requestId,
        escrowContractAddress
      );
      if (deadline !== null && isActive) {
        setNextDeadline(deadline);
      }
    };

    fetchNextDeadline();
    const interval = setInterval(fetchNextDeadline, pollInterval);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [requestId, escrowContractAddress, pollInterval]);

  // Update countdown every second
  useEffect(() => {
    if (nextDeadline === null) {
      setCountdown("");
      return;
    }

    const deadlineTimestamp =
      typeof nextDeadline === "bigint" ? Number(nextDeadline) : nextDeadline;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = deadlineTimestamp - now;
      setCountdown(formatCountdown(secondsRemaining));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextDeadline]);

  useEffect(() => {
    if (amount || !resourceUrl) {
      return;
    }

    const extractBaseUrl = (url: string): string | null => {
      try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
      } catch {
        return null;
      }
    };

    const fetchResourcePrice = async () => {
      const baseUrl = extractBaseUrl(resourceUrl);
      if (!baseUrl) return;

      try {
        const response = await fetch(
          `/api/resources?url=${encodeURIComponent(baseUrl)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.resource?.price_per_request) {
            setFetchedAmount(BigInt(Math.floor(data.resource.price_per_request * 1e6)));
          }
        }
      } catch (error) {
        console.error("[TransactionDetail] Error fetching resource price:", error);
      }
    };

    fetchResourcePrice();
  }, [amount, resourceUrl]);

  const handleSuccess = (action: string) => {
    console.log(
      "[TransactionDetail] Transaction confirmed, starting aggressive polling"
    );
    setPendingAction(action);
    setPollInterval(500);

    setTimeout(() => {
      setPendingAction(null);
    }, 3000);
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
          <svg
            className="animate-spin h-5 w-5 text-primary"
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
          <p className="text-sm text-primary">Loading contract status...</p>
        </div>
      </div>
    );
  }

  const displayAmount = BigInt(1000) || amount || statusData?.amount || fetchedAmount;
  
  const shouldShowCountdown = 
    countdown && 
    statusData?.status !== null && 
    statusData?.status !== 2 && 
    statusData?.status !== 4 && 
    statusData?.status !== 7;

  return (
    <div className="space-y-6">
      <div 
        className="transition-all duration-300 ease-in-out"
        style={{
          opacity: statusData?.hasStatus ? 1 : 0,
          maxHeight: statusData?.hasStatus ? '500px' : '0px',
          overflow: 'hidden',
        }}
      >
        <MoneyFlowDiagram
          status={statusData?.status ?? null}
          amount={displayAmount}
          buyerRefunded={statusData?.buyerRefunded}
        />
      </div>

      <div 
        className="transition-all duration-300 ease-in-out"
        style={{
          opacity: statusData?.hasStatus ? 1 : 0,
          maxHeight: statusData?.hasStatus ? '300px' : '0px',
          overflow: 'hidden',
        }}
      >
        <div className="bg-default border border-contrast rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary mb-3">
            Contract Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 min-h-[32px]">
              <span className="text-sm text-primary/70">On-Chain Status:</span>
              <div className="relative">
                <div 
                  className="absolute inset-0 flex items-center gap-2 px-3 py-1 rounded-full bg-highlight/20 border border-highlight transition-opacity duration-200"
                  style={{
                    opacity: pendingAction ? 1 : 0,
                    pointerEvents: pendingAction ? 'auto' : 'none',
                  }}
                >
                  <svg
                    className="animate-spin h-4 w-4 text-highlight"
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
                  <span className="text-sm font-medium text-highlight">
                    Updating...
                  </span>
                </div>
                <div 
                  className="transition-opacity duration-200"
                  style={{
                    opacity: pendingAction ? 0 : 1,
                  }}
                >
                  <ContractStatusBadge
                    statusLabel={statusData?.statusLabel ?? ''}
                    hasStatus={statusData?.hasStatus ?? false}
                    loading={false}
                    buyerRefunded={statusData?.buyerRefunded}
                  />
                </div>
              </div>
            </div>
            <div 
              className="transition-all duration-300 ease-in-out"
              style={{
                opacity: shouldShowCountdown ? 1 : 0,
                maxHeight: shouldShowCountdown ? '40px' : '0px',
                overflow: 'hidden',
              }}
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-primary/80" />
                <span className="font-semibold text-primary/80">
                  Next Deadline:
                </span>
                <span className="text-primary font-mono">{countdown}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DisputeActionButtons
        requestId={requestId}
        escrowAddress={escrowContractAddress}
        canOpen={
          pendingAction === "open" || pendingAction === "escalate"
            ? false
            : pendingAction === "cancel"
            ? false
            : statusData?.canOpen ?? false
        }
        canEscalate={
          pendingAction === "escalate"
            ? false
            : pendingAction === "open"
            ? false
            : statusData?.canEscalate ?? false
        }
        canCancel={
          pendingAction === "cancel"
            ? false
            : pendingAction === "open" || pendingAction === "escalate"
            ? true
            : statusData?.canCancel ?? false
        }
        onSuccess={handleSuccess}
      />
    </div>
  );
}
