'use client';

import { useEffect, useState } from 'react';
import { type Hex } from 'viem';
import {
  getRequestStatusFromContract,
  toRequestIdHex,
} from '@/lib/contracts/DisputeEscrowContract';
import { RequestStatus, RequestStatusLabels } from '@/lib/contracts/DisputeEscrowABI';
import type { DisputeStatus } from '@/lib/queries/transactions.server';
import CopyButton from './CopyButton';

interface Transaction {
  request_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: DisputeStatus;
  payment_settled_at: string | null;
  dispute_window_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TransactionWithContractStatus extends Transaction {
  contractStatus?: RequestStatus | null;
  contractStatusLabel?: string;
  isLoadingContractStatus?: boolean;
}

export default function MerchantTransactions({
  transactions,
  contractAddress,
}: {
  transactions: Transaction[];
  contractAddress?: string;
}) {
  const [transactionsWithStatus, setTransactionsWithStatus] = useState<
    TransactionWithContractStatus[]
  >(transactions);

  useEffect(() => {
    // Fetch on-chain status for each transaction
    const fetchContractStatuses = async () => {
      const updatedTransactions = await Promise.all(
        transactions.map(async (tx) => {
          try {
            const requestIdHex = toRequestIdHex(tx.request_id);
            const contractStatus = await getRequestStatusFromContract(
              requestIdHex,
              contractAddress as Hex | undefined
            );

            return {
              ...tx,
              contractStatus,
              contractStatusLabel: contractStatus !== null
                ? RequestStatusLabels[contractStatus]
                : 'Unknown',
              isLoadingContractStatus: false,
            };
          } catch (error) {
            console.error('Error fetching contract status:', error);
            return {
              ...tx,
              contractStatus: null,
              contractStatusLabel: 'Error',
              isLoadingContractStatus: false,
            };
          }
        })
      );

      setTransactionsWithStatus(updatedTransactions);
    };

    if (transactions.length > 0) {
      fetchContractStatuses();
    }
  }, [transactions, contractAddress]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No transactions yet. When customers pay for your services, they will appear here.
      </div>
    );
  }

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'escrowed':
        return 'bg-blue-100 text-blue-800';
      case 'escrow_released':
        return 'bg-green-100 text-green-800';
      case 'dispute_opened':
        return 'bg-yellow-100 text-yellow-800';
      case 'dispute_escalated':
      case 'master_review_escalation':
        return 'bg-orange-100 text-orange-800';
      case 'seller_accepted':
      case 'dispute_resolved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number) => {
    // Assuming amount is in USDC (6 decimals)
    return (amount / 1_000_000).toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-3">
      {transactionsWithStatus.map((tx) => {
        const hasDispute = [
          'dispute_opened',
          'dispute_escalated',
          'master_review_escalation',
        ].includes(tx.status);

        return (
          <div
            key={tx.request_id}
            className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow transition ${
              hasDispute ? 'border-yellow-300' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="mb-2">
                  <CopyButton 
                    value={tx.request_id}
                    label="Request ID:"
                    showFullValue={true}
                  />
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ${formatAmount(tx.amount)} USDC
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(
                    tx.status
                  )}`}
                >
                  DB: {tx.status.replace(/_/g, ' ').toUpperCase()}
                </span>
                {tx.contractStatusLabel && (
                  <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-indigo-100 text-indigo-800">
                    Chain: {tx.contractStatusLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <CopyButton 
                  value={tx.buyer_id}
                  label="Buyer:"
                  showFullValue={true}
                />
              </div>

              {tx.payment_settled_at && (
                <div>
                  <span className="font-semibold">Payment Settled:</span>{' '}
                  {new Date(tx.payment_settled_at).toLocaleString()}
                </div>
              )}

              {tx.dispute_window_expires_at && (
                <div>
                  <span className="font-semibold">Dispute Window Expires:</span>{' '}
                  {new Date(tx.dispute_window_expires_at).toLocaleString()}
                </div>
              )}

              <div className="text-gray-500">
                <span className="font-semibold">Created:</span>{' '}
                {new Date(tx.created_at).toLocaleString()}
              </div>
            </div>

            {hasDispute && (
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold">
                    This transaction is in dispute
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
