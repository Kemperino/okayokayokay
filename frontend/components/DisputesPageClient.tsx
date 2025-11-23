'use client';

import { useEffect, useState } from 'react';
import DisputesList from './DisputesList';
import { getSessionId } from '@/lib/session-manager';
import type { DisputeWithStatus } from '@/lib/actions/get-user-disputes';
import CopyButton from './CopyButton';

export default function DisputesPageClient() {
  const [disputes, setDisputes] = useState<DisputeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionId = getSessionId();

        // Get wallet address for this session
        const walletRes = await fetch(`/api/wallet?sessionId=${sessionId}`);
        if (!walletRes.ok) {
          throw new Error('Failed to get wallet address');
        }

        const walletData = await walletRes.json();
        const address = walletData.walletAddress;
        
        if (!address) {
          throw new Error('No wallet address in response');
        }
        
        setWalletAddress(address);

        // Fetch disputes
        const disputesRes = await fetch(`/api/disputes?address=${address}`);
        if (!disputesRes.ok) {
          throw new Error('Failed to fetch disputes');
        }

        const disputesData = await disputesRes.json();
        setDisputes(disputesData.disputes || []);
      } catch (err) {
        console.error('[DisputesPage] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load disputes');
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  if (loading) {
    return (
      <div className="bg-default border border-contrast rounded-lg p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <p className="text-lg font-semibold text-primary">Loading Disputes</p>
            <p className="text-sm text-primary/60 mt-1">
              Checking blockchain for dispute statuses...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/20 border border-error rounded-lg p-8 text-center">
        <svg className="w-12 h-12 mx-auto mb-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-error mb-2">Error Loading Disputes</h3>
        <p className="text-error/80">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {walletAddress && (
        <div className="mb-6 p-4 bg-default border border-contrast rounded-lg">
          <div className="text-sm">
            <CopyButton 
              value={walletAddress}
              label="Showing disputes for wallet:"
              showFullValue={false}
            />
          </div>
        </div>
      )}
      
      <DisputesList disputes={disputes} />
    </div>
  );
}

