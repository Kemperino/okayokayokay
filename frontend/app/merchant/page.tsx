'use client';

import { WalletConnectButton } from '@/components/WalletConnectButton';
import MerchantDashboard from '@/components/MerchantDashboard';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export default function MerchantPage() {
  const { isConnected } = useAccount();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Merchant Dashboard</h1>
        <p className="text-gray-600">
          View your sales, fulfilled requests, and their on-chain status
        </p>
      </div>

      {/* Wallet Connection */}
      <div className="mb-8">
        <WalletConnectButton />
      </div>

      {/* Dashboard - only shown when connected */}
      {isConnected && <MerchantDashboard />}
    </div>
  );
}
