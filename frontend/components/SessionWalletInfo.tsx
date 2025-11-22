'use client';

import { useEffect, useState } from 'react';
import { getOrCreateSessionId } from '@/lib/session-manager';

interface WalletInfo {
  walletAddress: string;
  usdcBalance: string;
  ethBalance: string;
  network: string;
}

export function SessionWalletInfo() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    fetchWalletInfo(id);

    // Auto-refresh balance every 10 seconds
    const interval = setInterval(() => {
      fetchWalletInfo(id);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchWalletInfo = async (id: string) => {
    try {
      const response = await fetch(`/api/wallet?sessionId=${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch wallet info');
      }

      const data = await response.json();
      setWalletInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">Loading your wallet...</p>
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

  if (!walletInfo) {
    return null;
  }

  const usdcBalance = parseFloat(walletInfo.usdcBalance);
  const hasBalance = usdcBalance > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold">Your Wallet</h2>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
          CDP Server Wallet
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-500 block">Wallet Address</label>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded block font-mono break-all">
            {walletInfo.walletAddress}
          </code>
        </div>

        <div>
          <label className="text-sm text-gray-500 block">Network</label>
          <span className="text-sm font-medium capitalize">{walletInfo.network}</span>
        </div>

        <div className="border-t pt-3 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 block">USDC Balance</label>
            <div className="text-xl font-bold text-blue-600">
              ${walletInfo.usdcBalance}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500 block">ETH Balance</label>
            <div className="text-lg font-semibold">
              {parseFloat(walletInfo.ethBalance).toFixed(6)}
            </div>
          </div>
        </div>

        {!hasBalance && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
            <p className="text-sm text-blue-800 mb-2 font-semibold">
              💰 Fund your wallet to make x402 requests
            </p>
            <p className="text-xs text-blue-700 mb-3">
              Send USDC to your wallet address above on Base network
            </p>
            <div className="flex gap-2">
              <a
                href={`https://basescan.org/address/${walletInfo.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View on BaseScan →
              </a>
            </div>
          </div>
        )}

        {hasBalance && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mt-4">
            <p className="text-sm text-green-800">
              ✓ Wallet funded and ready for x402 requests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
