"use client";

import { useEffect, useState } from "react";
import { getOrCreateSessionId } from "@/lib/session-manager";
import Link from "next/link";

interface WalletInfo {
  walletAddress: string;
  usdcBalance: string;
  ethBalance: string;
  network: string;
}

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletBadge() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchWalletInfo = async () => {
      try {
        const sessionId = getOrCreateSessionId();
        const response = await fetch(`/api/wallet?sessionId=${sessionId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch wallet info");
        }

        const data = await response.json();
        setWalletInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchWalletInfo();

    // Auto-refresh balance every 30 seconds
    const interval = setInterval(() => {
      fetchWalletInfo();
    }, 30000);

    return () => clearInterval(interval);
  }, [mounted]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-contrast rounded-lg">
        <div className="h-4 w-20 bg-default rounded"></div>
      </div>
    );
  }

  if (error || !walletInfo) {
    return (
      <Link
        href="/wallet"
        className="flex items-center gap-2 px-3 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition text-sm"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span>Wallet Error</span>
      </Link>
    );
  }

  const usdcBalance = parseFloat(walletInfo.usdcBalance);
  const hasBalance = usdcBalance > 0;

  return (
    <Link
      href="/wallet"
      className="flex items-center gap-3 px-3 py-2 bg-contrast hover:bg-default rounded-lg transition"
    >
      {/* Wallet Icon */}
      <svg
        className="w-5 h-5 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>

      {/* Address & Balance */}
      <div className="flex flex-col">
        <span className="text-xs font-mono text-primary/70">
          {truncateAddress(walletInfo.walletAddress)}
        </span>
        <span
          className={`text-xs font-semibold ${
            hasBalance ? "text-success" : "text-primary/50"
          }`}
        >
          ${walletInfo.usdcBalance} USDC
        </span>
      </div>

      {/* Status Indicator */}
      <div
        className={`w-2 h-2 rounded-full ${
          hasBalance ? "bg-success" : "bg-primary/30"
        }`}
      ></div>
    </Link>
  );
}
