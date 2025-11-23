'use client';

import Link from 'next/link';
import { RequestStatusLabels, RequestStatus } from '@/lib/contracts/DisputeEscrowABI';
import type { DisputeWithStatus } from '@/lib/actions/get-user-disputes';

interface DisputesListProps {
  disputes: DisputeWithStatus[];
}

function getStatusColor(status: RequestStatus) {
  switch (status) {
    case RequestStatus.DisputeOpened:
      return 'bg-warning/20 text-warning border-warning';
    case RequestStatus.DisputeEscalated:
      return 'bg-error/20 text-error border-error';
    case RequestStatus.SellerAccepted:
    case RequestStatus.DisputeResolved:
      return 'bg-success/20 text-success border-success';
    default:
      return 'bg-contrast text-primary border-contrast';
  }
}

function getStatusIcon(status: RequestStatus) {
  if (status === RequestStatus.DisputeOpened || status === RequestStatus.DisputeEscalated) {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function getSellerDescription(sellerDescription: any): string | null {
  if (!sellerDescription) return null;

  if (sellerDescription.accepts && Array.isArray(sellerDescription.accepts)) {
    const firstAccept = sellerDescription.accepts[0];
    return firstAccept?.description || null;
  }

  if (typeof sellerDescription === 'string') {
    return sellerDescription;
  }

  return null;
}

export default function DisputesList({ disputes }: DisputesListProps) {
  if (disputes.length === 0) {
    return (
      <div className="bg-default border border-contrast rounded-lg p-8 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-primary mb-2">No Active Disputes</h3>
        <p className="text-primary/60">
          You don&apos;t have any active disputes at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => {
        const description = getSellerDescription(dispute.seller_description);
        const path = dispute.input_data?.path || dispute.resource_url || 'Unknown';
        const statusLabel = dispute.contractStatus.status !== null 
          ? RequestStatusLabels[dispute.contractStatus.status]
          : 'Unknown';

        return (
          <Link
            key={dispute.request_id}
            href={`/transactions/${dispute.request_id}`}
            className="block bg-default border border-contrast rounded-lg p-6 shadow-sm hover:shadow-md hover:border-highlight transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-3 flex-1">
                {dispute.contractStatus.status !== null && getStatusIcon(dispute.contractStatus.status)}
                <div className="flex-1">
                  {description && (
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      {description}
                    </h3>
                  )}
                  <p className="text-sm text-primary/70 font-mono break-all">
                    {path}
                  </p>
                </div>
              </div>
              <span
                className={`ml-3 px-3 py-1 rounded text-xs font-medium whitespace-nowrap border ${
                  dispute.contractStatus.status !== null 
                    ? getStatusColor(dispute.contractStatus.status)
                    : 'bg-contrast text-primary border-contrast'
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-primary/60">Request ID:</span>
                <code className="ml-2 text-xs bg-contrast px-2 py-1 rounded font-mono text-primary">
                  {dispute.request_id.slice(0, 16)}...
                </code>
              </div>

              {dispute.seller_address && (
                <div>
                  <span className="text-primary/60">Seller:</span>
                  <code className="ml-2 text-xs bg-contrast px-2 py-1 rounded font-mono text-primary">
                    {dispute.seller_address.slice(0, 6)}...{dispute.seller_address.slice(-4)}
                  </code>
                </div>
              )}

              <div>
                <span className="text-primary/60">Created:</span>
                <span className="ml-2 text-primary/80">
                  {new Date(dispute.created_at).toLocaleString()}
                </span>
              </div>

              {dispute.completed_at && (
                <div>
                  <span className="text-primary/60">Completed:</span>
                  <span className="ml-2 text-primary/80">
                    {new Date(dispute.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-contrast">
              <div className="flex items-center justify-between">
                <div className="text-sm text-primary/60">
                  {dispute.contractStatus.status === RequestStatus.DisputeOpened && (
                    <span>Dispute is open - awaiting seller response</span>
                  )}
                  {dispute.contractStatus.status === RequestStatus.DisputeEscalated && (
                    <span>Escalated to dispute agent for review</span>
                  )}
                  {dispute.contractStatus.status === RequestStatus.SellerAccepted && (
                    <span>Seller accepted refund - dispute resolved</span>
                  )}
                  {dispute.contractStatus.status === RequestStatus.DisputeResolved && (
                    <span>Dispute resolved by agent</span>
                  )}
                </div>
                <span className="text-sm text-highlight hover:underline">
                  View Details →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

