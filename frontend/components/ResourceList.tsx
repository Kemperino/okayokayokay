'use client';

import { useState } from 'react';
import ResourceTester from './ResourceTester';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  base_url: string;
  well_known_url: string;
  payment_address: string | null;
  price_per_request: number | null;
  created_at: string;
}

export default function ResourceList({ resources }: { resources: Resource[] }) {
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  if (!resources || resources.length === 0) {
    return (
      <div className="border border-contrast rounded-lg p-8 text-center text-primary/60">
        No resources added yet. Add your first x402 resource above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => (
        <div key={resource.id} className="border border-contrast rounded-lg p-6 bg-default shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-primary">{resource.name}</h3>
              {resource.description && (
                <p className="text-primary/70 mt-1">{resource.description}</p>
              )}
            </div>
            <button
              onClick={() =>
                setSelectedResource(selectedResource === resource.id ? null : resource.id)
              }
              className="bg-highlight text-primary px-4 py-2 rounded hover:bg-highlight/90 transition text-sm"
            >
              {selectedResource === resource.id ? 'Close' : 'Use'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-primary/80">Base URL:</span>
              <br />
              <a
                href={resource.base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-highlight hover:underline break-all"
              >
                {resource.base_url}
              </a>
            </div>
            <div>
              <span className="font-semibold text-primary/80">Payment Address:</span>
              <br />
              {resource.payment_address ? (
                <code className="text-xs bg-contrast px-2 py-1 rounded break-all text-primary">
                  {resource.payment_address}
                </code>
              ) : (
                <span className="text-primary/50">Not configured</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-primary/80">Price Per Request:</span>
              <br />
              {resource.price_per_request ? (
                <span className="text-primary">{resource.price_per_request} USDC</span>
              ) : (
                <span className="text-primary/50">Not configured</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-primary/80">Added:</span>
              <br />
              <span className="text-primary/60">
                {new Date(resource.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {selectedResource === resource.id && (
            <div className="mt-6 pt-6 border-t border-contrast">
              <ResourceTester resource={resource} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
