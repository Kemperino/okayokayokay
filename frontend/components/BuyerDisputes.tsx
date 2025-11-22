'use client';

import { useEffect, useState } from 'react';
import { type Hex } from 'viem';
import {
  getRequestStatusFromContract,
  toRequestIdHex,
} from '@/lib/contracts/DisputeEscrowContract';
import { RequestStatus, RequestStatusLabels } from '@/lib/contracts/DisputeEscrowABI';
import type { DisputeStatus } from '@/lib/queries/transactions.server';

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

interface BuyerDisputesProps {
  transactions: Transaction[];
  contractAddress?: string;
  showOnlyUnresolved?: boolean;
}

export default function BuyerDisputes({
  transactions,
  contractAddress,
  showOnlyUnresolved = false,
}: BuyerDisputesProps) {
  const [transactionsWithStatus, setTransactionsWithStatus] = useState<
    TransactionWithContractStatus[]
  >(transactions);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'disputed'>(
    showOnlyUnresolved ? 'unresolved' : 'all'
  );

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

  // Filter transactions based on selected filter
  const filteredTransactions = transactionsWithStatus.filter((tx) => {
    if (filter === 'all') return true;

    if (filter === 'disputed') {
      return ['dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status);
    }

    if (filter === 'unresolved') {
      return ['service_initiated', 'escrowed', 'dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status);
    }

    return true;
  });

  if (!transactions || transactions.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No transactions yet. Make x402 requests to see them here.
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
        return 'bg-green-100 text-green-800';
      case 'dispute_resolved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: DisputeStatus) => {
    if (['dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(status)) {
      return (
        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    if (['escrow_released', 'seller_accepted', 'dispute_resolved'].includes(status)) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    );
  };

  const formatAmount = (amount: number) => {
    // Assuming amount is in USDC (6 decimals)
    return (amount / 1_000_000).toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const unresolvedCount = transactions.filter(tx =>
    ['service_initiated', 'escrowed', 'dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status)
  ).length;

  const disputedCount = transactions.filter(tx =>
    ['dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium text-sm transition ${
            filter === 'all'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({transactions.length})
        </button>
        <button
          onClick={() => setFilter('unresolved')}
          className={`px-4 py-2 font-medium text-sm transition ${
            filter === 'unresolved'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Unresolved ({unresolvedCount})
        </button>
        <button
          onClick={() => setFilter('disputed')}
          className={`px-4 py-2 font-medium text-sm transition ${
            filter === 'disputed'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          In Dispute ({disputedCount})
        </button>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-500">
          No {filter === 'all' ? '' : filter} transactions found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const isDisputed = ['dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status);
            const isUnresolved = ['service_initiated', 'escrowed', 'dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status);

            return (
              <div
                key={tx.request_id}
                className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow transition ${
                  isDisputed ? 'border-yellow-300 bg-yellow-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(tx.status)}
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        Request ID: {tx.request_id.slice(0, 16)}...
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        ${formatAmount(tx.amount)} USDC
                      </div>
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
                    <span className="font-semibold">Seller:</span>{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded">
                      {formatAddress(tx.seller_id)}
                    </code>
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

                {isDisputed && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-yellow-700">
                        <span className="font-semibold">
                          This transaction is in dispute
                        </span>
                      </div>
                      <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition">
                        View Details
                      </button>
                    </div>
                  </div>
                )}

                {isUnresolved && !isDisputed && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-700">
                        <span className="font-semibold">Action available</span>
                      </div>
                      <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">
                        File Dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
