'use client';

import { useEffect, useState } from 'react';
import ContractStatusBadge from './ContractStatusBadge';
import { getContractStatus, type ContractStatusResult } from '@/lib/actions/get-contract-status';

interface ContractStatusBadgeClientProps {
  requestId: string;
  escrowContractAddress: string | null;
}

export default function ContractStatusBadgeClient({
  requestId,
  escrowContractAddress,
}: ContractStatusBadgeClientProps) {
  const [statusResult, setStatusResult] = useState<ContractStatusResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const result = await getContractStatus(requestId, escrowContractAddress);
        setStatusResult(result);
      } catch (error) {
        console.error('Failed to fetch contract status:', error);
        setStatusResult({
          status: null,
          statusLabel: 'Error',
          hasStatus: false,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [requestId, escrowContractAddress]);

  return (
    <ContractStatusBadge
      statusLabel={statusResult?.statusLabel || 'Loading...'}
      hasStatus={statusResult?.hasStatus || false}
      loading={loading}
    />
  );
}

