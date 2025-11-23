'use client';

import { useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  showFullValue?: boolean;
}

export default function CopyButton({
  value,
  label,
  className = '',
  showFullValue = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-primary/60 whitespace-nowrap min-w-[60px]">{label}</span>}
      <div className="flex items-center gap-1 bg-contrast px-2 py-1 rounded flex-1 min-w-0">
        <code className="text-xs font-mono text-primary truncate">
          {showFullValue ? value : `${value.slice(0, 6)}...${value.slice(-4)}`}
        </code>
        <button
          onClick={handleCopy}
          className="ml-1 text-primary/60 hover:text-primary transition-colors flex-shrink-0"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

