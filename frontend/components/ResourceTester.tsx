'use client';

import { useState } from 'react';
import { getOrCreateSessionId } from '@/lib/session-manager';

interface Resource {
  id: string;
  name: string;
  base_url: string;
}

export default function ResourceTester({ resource }: { resource: Resource }) {
  const [path, setPath] = useState('/weather');
  const [params, setParams] = useState<Record<string, string>>({
    location: 'New York',
    date: '2025-01-15',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const addParam = () => {
    setParams({ ...params, [`param${Object.keys(params).length + 1}`]: '' });
  };

  const updateParam = (oldKey: string, newKey: string, value: string) => {
    const newParams = { ...params };
    if (oldKey !== newKey) {
      delete newParams[oldKey];
    }
    newParams[newKey] = value;
    setParams(newParams);
  };

  const removeParam = (key: string) => {
    const newParams = { ...params };
    delete newParams[key];
    setParams(newParams);
  };

  const handleTest = async () => {
    const sessionId = getOrCreateSessionId();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/proxy-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: resource.id,
          path,
          params,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-lg">Test Resource</h4>

      <div>
        <label className="block text-sm font-medium mb-1">Request Path</label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="w-full border rounded px-3 py-2 font-mono text-sm"
          placeholder="/weather"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Query Parameters</label>
        <div className="space-y-2">
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <input
                type="text"
                value={key}
                onChange={(e) => updateParam(key, e.target.value, value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="parameter name"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => updateParam(key, key, e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="value"
              />
              <button
                onClick={() => removeParam(key)}
                className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addParam}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          + Add parameter
        </button>
      </div>

      <button
        onClick={handleTest}
        disabled={loading}
        className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 transition disabled:opacity-50 font-medium"
      >
        {loading ? 'Testing...' : 'Test Request (Auto-Pay)'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <span className="font-semibold">Success!</span>
            {result.paymentDetails && (
              <span className="ml-2">Payment processed automatically by server wallet.</span>
            )}
          </div>

          {result.sessionWallet && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
              <div className="font-medium text-blue-900 mb-1">Paid by Your Session Wallet</div>
              <code className="text-xs bg-white px-2 py-1 rounded break-all">
                {result.sessionWallet}
              </code>
            </div>
          )}

          {result.paymentDetails && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h5 className="font-semibold mb-2">Payment Details</h5>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Amount:</span> {result.paymentDetails.amount}
                </div>
                <div>
                  <span className="font-medium">To:</span>
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded break-all">
                    {result.paymentDetails.to}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Transaction Hash:</span>
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded break-all">
                    {result.paymentDetails.txHash}
                  </code>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 p-4 rounded">
            <h5 className="font-semibold mb-2">Response Data</h5>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
