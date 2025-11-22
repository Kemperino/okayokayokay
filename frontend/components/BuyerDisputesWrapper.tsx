'use client';

import { useEffect, useState } from 'react';
import { getOrCreateSessionId } from '@/lib/session-manager';
import BuyerDisputes from './BuyerDisputes';
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

interface BuyerDisputesWrapperProps {
  contractAddress?: string;
}

export default function BuyerDisputesWrapper({ contractAddress }: BuyerDisputesWrapperProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unresolvedTransactions, setUnresolvedTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletAndTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get session ID and fetch wallet info
        const sessionId = getOrCreateSessionId();
        const walletResponse = await fetch(`/api/wallet?sessionId=${sessionId}`);

        if (!walletResponse.ok) {
          throw new Error('Failed to fetch wallet info');
        }

        const walletData = await walletResponse.json();
        const address = walletData.walletAddress;
        setWalletAddress(address);

        // Fetch transactions for this wallet
        const params = new URLSearchParams({ address });
        if (contractAddress) {
          params.append('contract', contractAddress);
        }

        const txResponse = await fetch(`/api/transactions?${params.toString()}`);

        if (!txResponse.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const txData = await txResponse.json();
        setTransactions(txData.transactions || []);
        setUnresolvedTransactions(txData.unresolved || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletAndTransactions();
  }, [contractAddress]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Loading your transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2 text-red-700">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const disputedCount = transactions.filter(tx =>
    ['dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
          <div className="text-3xl font-bold text-gray-900">
            {transactions.length}
          </div>
        </div>
        <div className="bg-white border border-yellow-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Unresolved</div>
          <div className="text-3xl font-bold text-yellow-600">
            {unresolvedTransactions.length}
          </div>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">In Dispute</div>
          <div className="text-3xl font-bold text-red-600">
            {disputedCount}
          </div>
        </div>
      </div>

      {/* Transactions with Filtering */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
        <BuyerDisputes
          transactions={transactions}
          contractAddress={contractAddress}
          showOnlyUnresolved={false}
        />
      </div>
    </div>
  );
}
