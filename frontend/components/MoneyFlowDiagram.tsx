'use client';

import { DollarSign } from 'lucide-react';

interface MoneyFlowDiagramProps {
  status: number | null;
  amount: bigint | null;
  buyerRefunded?: boolean;
}

const formatUSDC = (amount: bigint): string => {
  const usdc = Number(amount) / 1e6;
  return usdc.toFixed(2);
};

export default function MoneyFlowDiagram({ 
  status, 
  amount,
  buyerRefunded = false 
}: MoneyFlowDiagramProps) {
  const usdcAmount = amount ? formatUSDC(amount) : '0.0001';

  const hasEscrowed = status !== null && status >= 1;
  const releasedToSeller = status === 2 || (status === 7 && !buyerRefunded);
  const refundedToBuyer = status === 4 || (status === 7 && buyerRefunded);

  return (
    <div className="bg-default border border-contrast rounded-lg p-6 overflow-hidden">
      <h3 className="text-lg font-semibold text-primary mb-6">Dispute Graph</h3>
      
      <div className="relative py-4 min-h-[180px]">
        <div className="flex items-start justify-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-500 ${
              !hasEscrowed 
                ? 'bg-highlight/20 border-2 border-highlight shadow-lg ring-4 ring-highlight/20' 
                : refundedToBuyer
                  ? 'bg-success/20 border-2 border-success shadow-lg ring-4 ring-success/20'
                  : 'bg-primary/5 border-2 border-primary/20'
            }`}>
              👤
            </div>
            <span className="text-sm font-semibold text-primary">Buyer</span>
          </div>

          <div className="relative flex flex-col items-center pt-[38px] min-h-[60px]">
            <div className="flex items-center">
              {!hasEscrowed ? (
                <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-highlight to-transparent animate-pulse" />
              ) : refundedToBuyer ? (
                <div className="w-32 h-0.5 bg-success" />
              ) : releasedToSeller ? (
                <div className="w-32 h-0.5 bg-primary/10" />
              ) : (
                <div className="w-32 h-0.5 bg-success" />
              )}
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${
              !hasEscrowed 
                ? 'bg-highlight/90 border-highlight text-white shadow-lg'
                : refundedToBuyer
                  ? 'bg-success/90 border-success text-white shadow-lg'
                  : releasedToSeller
                    ? 'bg-success/90 border-success text-white opacity-40'
                    : 'bg-success/90 border-success text-white'
            }`}>
              <div className="flex items-center gap-1">
                <DollarSign size={10} />
                <span>{usdcAmount} USDC</span>
                {!hasEscrowed && <span className="ml-1">→</span>}
                {refundedToBuyer && <span className="ml-1">←</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-500 ${
              hasEscrowed && !releasedToSeller && !refundedToBuyer
                ? 'bg-highlight/20 border-2 border-highlight shadow-lg ring-4 ring-highlight/20 animate-pulse'
                : 'bg-primary/5 border-2 border-primary/20'
            }`}>
              🔒
            </div>
            <span className="text-sm font-semibold text-primary">Escrow</span>
          </div>

          <div className="relative flex flex-col items-center pt-[38px] min-h-[60px]">
            <div className="flex items-center">
              {releasedToSeller ? (
                <div className="w-32 h-0.5 bg-success" />
              ) : (
                <div className="w-32 h-0.5 bg-primary/10" />
              )}
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${
              releasedToSeller 
                ? 'bg-success/90 border-success text-white shadow-lg' 
                : 'bg-transparent border-transparent text-transparent'
            }`}>
              <div className="flex items-center gap-1">
                <DollarSign size={10} />
                <span>{usdcAmount} USDC</span>
                <span className="ml-1">→</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-500 ${
              releasedToSeller 
                ? 'bg-success/20 border-2 border-success shadow-lg ring-4 ring-success/20' 
                : 'bg-primary/5 border-2 border-primary/20'
            }`}>
              🏪
            </div>
            <span className="text-sm font-semibold text-primary">Seller</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <div className="inline-flex items-center gap-2 bg-contrast/50 px-4 py-2 rounded-full border border-contrast">
          <div className={`w-2 h-2 rounded-full ${
            !hasEscrowed ? 'bg-highlight animate-pulse' :
            hasEscrowed && !releasedToSeller && !refundedToBuyer ? 'bg-highlight animate-pulse' :
            'bg-success'
          }`} />
          <span className="text-xs text-primary/60">Current Status:</span>
          <span className="text-sm font-semibold text-primary">
            {status === 0 && 'Awaiting Payment'}
            {status === 1 && 'Funds in Escrow'}
            {status === 2 && 'Released to Seller'}
            {status === 3 && 'Dispute Opened'}
            {status === 4 && 'Seller Refunded'}
            {status === 5 && 'Dispute Rejected by Seller'}
            {status === 6 && 'Escalated to Agent'}
            {status === 7 && (buyerRefunded ? 'Seller Refunded' : 'Released to Seller')}
          </span>
        </div>
      </div>
    </div>
  );
}

