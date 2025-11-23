'use client';

import { useState } from 'react';

interface CopyableCodeProps {
  value: string;
  label?: string;
}

export default function CopyableCode({ value, label }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div>
      {label && (
        <label className="text-sm font-semibold text-primary/80 block mb-1">
          {label}
        </label>
      )}
      <div className="flex items-start gap-2 bg-contrast px-3 py-2 rounded">
        <code className="text-xs font-mono break-all text-primary flex-1">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="text-primary/60 hover:text-primary transition-colors flex-shrink-0 mt-0.5"
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

