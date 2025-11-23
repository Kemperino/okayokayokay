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
      <div className="bg-default border border-contrast rounded-lg p-6">
        <p className="text-primary/60">Loading your wallet...</p>
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

  if (!walletInfo) {
    return null;
  }

  const usdcBalance = parseFloat(walletInfo.usdcBalance);
  const hasBalance = usdcBalance > 0;

  return (
    <div className="bg-default border border-contrast rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold text-primary">Your Wallet</h2>
        <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">
          CDP Server Wallet
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-primary/70 block">Wallet Address</label>
          <code className="text-xs bg-contrast px-2 py-1 rounded block font-mono break-all text-primary">
            {walletInfo.walletAddress}
          </code>
        </div>

        <div>
          <label className="text-sm text-primary/70 block">Network</label>
          <span className="text-sm font-medium capitalize text-primary">{walletInfo.network}</span>
        </div>

        <div className="border-t border-contrast pt-3 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-primary/70 block">USDC Balance</label>
            <div className="text-xl font-bold text-highlight">
              ${walletInfo.usdcBalance}
            </div>
          </div>

          <div>
            <label className="text-sm text-primary/70 block">ETH Balance</label>
            <div className="text-lg font-semibold text-primary">
              {parseFloat(walletInfo.ethBalance).toFixed(6)}
            </div>
          </div>
        </div>

        {!hasBalance && (
          <div className="bg-highlight/20 border border-highlight rounded p-4 mt-4">
            <p className="text-sm text-highlight mb-2 font-semibold">
              💰 Fund your wallet to make x402 requests
            </p>
            <p className="text-xs text-primary/70 mb-3">
              Send USDC to your wallet address above on Base network
            </p>
            <div className="flex gap-2">
              <a
                href={`https://basescan.org/address/${walletInfo.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-highlight hover:underline"
              >
                View on BaseScan →
              </a>
            </div>
          </div>
        )}

        {hasBalance && (
          <div className="bg-success/20 border border-success rounded p-3 mt-4">
            <p className="text-sm text-success">
              ✓ Wallet funded and ready for x402 requests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
