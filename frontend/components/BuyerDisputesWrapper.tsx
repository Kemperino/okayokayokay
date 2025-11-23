'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrCreateSessionId } from '@/lib/session-manager';
import BuyerDisputes from './BuyerDisputes';
import type { DisputeStatus, ResourceRequest } from '@/lib/queries/transactions.server';

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
  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>([]);
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
        setResourceRequests(txData.resourceRequests || []);
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
            <div key={i} className="bg-default border border-contrast rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-contrast rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-contrast rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="bg-default border border-contrast rounded-lg p-8 text-center">
          <p className="text-primary/60">Loading your transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/20 border border-error rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2 text-error">Error</h2>
        <p className="text-error/80">{error}</p>
      </div>
    );
  }

  const disputedCount = transactions.filter(tx =>
    ['dispute_opened', 'dispute_escalated', 'master_review_escalation'].includes(tx.status)
  ).length;

  const totalRequests = transactions.length + resourceRequests.length;
  const pendingRequests = resourceRequests.filter(r => r.status === 'pending' || !r.completed_at).length;
  const failedRequests = resourceRequests.filter(r => r.status === 'error' || r.error_message).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-default border border-contrast rounded-lg p-6">
          <div className="text-sm text-primary/70 mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-primary">
            {totalRequests}
          </div>
          <div className="text-xs text-primary/50 mt-1">
            {transactions.length} escrow | {resourceRequests.length} x402
          </div>
        </div>
        <div className="bg-default border border-warning rounded-lg p-6">
          <div className="text-sm text-primary/70 mb-1">Pending</div>
          <div className="text-3xl font-bold text-warning">
            {unresolvedTransactions.length + pendingRequests}
          </div>
        </div>
        <div className="bg-default border border-error rounded-lg p-6">
          <div className="text-sm text-primary/70 mb-1">In Dispute</div>
          <div className="text-3xl font-bold text-error">
            {disputedCount}
          </div>
          <div className="text-xs text-primary/50 mt-1">
            {failedRequests} failed requests
          </div>
        </div>
      </div>

      {/* Resource Requests */}
      {resourceRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-primary">x402 Resource Requests</h2>
          <div className="space-y-3">
            {resourceRequests.map((req) => (
              <Link
                key={`${req.request_id}-${req.user_address}`}
                href={`/transactions/${req.request_id}`}
                className={`block border border-contrast rounded-lg p-4 bg-default shadow-sm hover:shadow hover:border-highlight transition cursor-pointer ${
                  req.error_message ? 'border-error bg-error/10' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-mono text-primary/70">
                      {req.request_id.slice(0, 16)}...
                    </div>
                    <div className="text-sm text-primary mt-1">
                      {req.resource_url || 'No URL'}
                    </div>
                    {req.tx_hash && (
                      <div className="text-xs text-primary/50 mt-1">
                        Tx: {req.tx_hash.slice(0, 10)}...{req.tx_hash.slice(-8)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        req.status === 'completed'
                          ? 'bg-success/20 text-success'
                          : req.status === 'error'
                          ? 'bg-error/20 text-error'
                          : 'bg-highlight/20 text-highlight'
                      }`}
                    >
                      {req.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-primary/50">
                      {new Date(req.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                {req.error_message && (
                  <div className="mt-2 text-sm text-error">
                    Error: {req.error_message}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Escrow Transactions with Disputes */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-primary">Escrow Transactions</h2>
          <BuyerDisputes
            transactions={transactions}
            contractAddress={contractAddress}
            showOnlyUnresolved={false}
          />
        </div>
      )}

      {totalRequests === 0 && (
        <div className="border border-contrast rounded-lg p-8 text-center text-primary/60 bg-default">
          No requests yet. Make x402 requests to see them here.
        </div>
      )}
    </div>
  );
}
