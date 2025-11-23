'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import ContractStatusBadgeClient from '../ContractStatusBadgeClient';
import CopyButton from '../CopyButton';

type ResourceRequest = {
  request_id: string;
  user_address: string;
  input_data: any;
  output_data: any | null;
  seller_address: string;
  seller_description: any | null;
  tx_hash: string | null;
  resource_url: string | null;
  status: string;
  error_message: string | null;
  escrow_contract_address: string | null;
  created_at: string;
  completed_at: string | null;
};

export function RealtimeResourceRequests() {
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRequestId, setNewRequestId] = useState<string | null>(null);

  useEffect(() => {
    // Load initial requests
    supabase
      .from('resource_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setRequests(data as ResourceRequest[]);
        }
        setLoading(false);
      });

    // Subscribe to new requests
    const channel = supabase
      .channel('resource_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_requests',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRequest = payload.new as ResourceRequest;
            setRequests((prev) => [newRequest, ...prev]);
            setNewRequestId(newRequest.request_id);
            setTimeout(() => setNewRequestId(null), 5000);
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((req) =>
                req.request_id === (payload.new as ResourceRequest).request_id
                  ? (payload.new as ResourceRequest)
                  : req
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-6 text-primary">Loading resource requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="p-6 text-primary/60">
        No resource requests yet. Make your first x402 request!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const isNew = request.request_id === newRequestId;
        return (<div
          key={request.request_id}
          className={`border border-contrast rounded-lg p-4 shadow-sm hover:shadow-md transition-all ${
            isNew ? 'bg-highlight/20 border-highlight animate-pulse' : 'bg-default'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="font-mono text-xs text-primary/70 mb-2">
                {request.resource_url || request.input_data?.path || 'Request'}
              </div>
              <div className="mb-2">
                <CopyButton 
                  value={request.user_address}
                  label="User:"
                  showFullValue={true}
                />
              </div>
              {request.seller_address && (
                <div className="mb-2">
                  <CopyButton 
                    value={request.seller_address}
                    label="Seller:"
                    showFullValue={true}
                  />
                </div>
              )}
              {request.tx_hash && (
                <div className="mb-2">
                  <CopyButton 
                    value={request.tx_hash}
                    label="TX:"
                    showFullValue={true}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <ContractStatusBadgeClient
                requestId={request.request_id}
                escrowContractAddress={request.escrow_contract_address}
              />
            </div>
          </div>

          {request.input_data?.params && Object.keys(request.input_data.params).length > 0 && (
            <div className="text-xs text-primary/60 mb-2">
              Params: {Object.entries(request.input_data.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}
            </div>
          )}

          <div className="text-xs text-primary/40 mt-2">
            {new Date(request.created_at).toLocaleString()}
            {request.completed_at && (
              <> • Completed {new Date(request.completed_at).toLocaleTimeString()}</>
            )}
          </div>
        </div>);
      })}
    </div>
  );
}
