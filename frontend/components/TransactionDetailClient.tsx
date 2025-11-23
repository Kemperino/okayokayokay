"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import DisputeActionButtons from "./DisputeActionButtons";
import ContractStatusBadge from "./ContractStatusBadge";
import { getContractNextDeadline } from "@/lib/actions/get-contract-status";

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
}: TransactionDetailClientProps) {
  const [statusData, setStatusData] = useState<ContractStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [nextDeadline, setNextDeadline] = useState<bigint | number | null>(
    null
  );
  const [countdown, setCountdown] = useState<string>("");

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
        };

        console.log("[TransactionDetail] Fetched status:", newStatusData);

        // Only update status data if not in pending state, or if status actually changed
        setStatusData(newStatusData);
      } catch (error) {
        console.error("Error fetching contract status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContractStatus();
  }, [requestId, escrowContractAddress, refreshKey]);

  // Fetch next deadline
  useEffect(() => {
    const fetchNextDeadline = async () => {
      if (!escrowContractAddress) return;

      const deadline = await getContractNextDeadline(
        requestId,
        escrowContractAddress
      );
      if (deadline !== null) {
        setNextDeadline(deadline);
      }
    };

    fetchNextDeadline();
  }, [requestId, escrowContractAddress, refreshKey]);

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

  const handleSuccess = (action: string) => {
    setPendingAction(action);

    // Transaction is already confirmed when this is called
    // Immediately refetch status
    setRefreshKey((prev) => prev + 1);

    // Do one more refetch after 2 seconds in case the indexer/webhook needs time to process
    setTimeout(() => {
      console.log(
        "[TransactionDetail] Final status refetch after indexer delay"
      );
      setRefreshKey((prev) => prev + 1);
      setPendingAction(null);
    }, 2000);
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

  return (
    <div className="space-y-6">
      {statusData && statusData.hasStatus && (
        <div className="bg-default border border-contrast rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary mb-3">
            Contract Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-primary/70">On-Chain Status:</span>
              {pendingAction ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-highlight/20 border border-highlight">
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
              ) : (
                <ContractStatusBadge
                  requestId={requestId}
                  escrowContractAddress={escrowContractAddress}
                  key={refreshKey}
                />
              )}
            </div>
            {countdown && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-primary/80" />
                <span className="font-semibold text-primary/80">
                  Next Deadline:
                </span>
                <span className="text-primary font-mono">{countdown}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <DisputeActionButtons
        requestId={requestId}
        escrowAddress={escrowContractAddress}
        canOpen={
          pendingAction === "open" || pendingAction === "escalate"
            ? false
            : pendingAction === "cancel"
            ? false // After cancel, don't immediately show open (wait for confirmation)
            : statusData?.canOpen ?? false
        }
        canEscalate={
          pendingAction === "escalate"
            ? false
            : pendingAction === "open"
            ? false // After opening dispute, escalate isn't immediately available (seller must respond first)
            : statusData?.canEscalate ?? false
        }
        canCancel={
          pendingAction === "cancel"
            ? false
            : pendingAction === "open" || pendingAction === "escalate"
            ? true // Optimistically show cancel after opening or escalating dispute
            : statusData?.canCancel ?? false
        }
        onSuccess={handleSuccess}
      />
    </div>
  );
}
