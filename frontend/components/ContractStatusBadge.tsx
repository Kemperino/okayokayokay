'use client';

interface ContractStatusBadgeProps {
  statusLabel: string;
  hasStatus: boolean;
  loading?: boolean;
  buyerRefunded?: boolean;
}

export default function ContractStatusBadge({
  statusLabel,
  hasStatus,
  loading = false,
  buyerRefunded,
}: ContractStatusBadgeProps) {

  if (loading) {
    return (
      <div className="text-xs text-gray-400 animate-pulse">
        Loading status...
      </div>
    );
  }

  const getStatusColor = (label: string) => {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes('escrowed')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (lowerLabel.includes('released')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (lowerLabel.includes('dispute opened')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (lowerLabel.includes('dispute escalated')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (lowerLabel.includes('resolved') || lowerLabel.includes('accepted')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }

    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const isResolved = statusLabel.toLowerCase().includes('resolved');
  const displayLabel = isResolved && buyerRefunded !== undefined
    ? `${statusLabel} - ${buyerRefunded ? 'Refunded to Buyer' : 'Released to Seller'}`
    : statusLabel;

  return (
    <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(statusLabel)}`}>
      {hasStatus ? (
        <span className="font-medium">{displayLabel}</span>
      ) : (
        <span className="italic">{displayLabel}</span>
      )}
    </div>
  );
}
