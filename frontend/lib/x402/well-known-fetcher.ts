/**
 * Utility for fetching and caching .well-known/x402 metadata from resources
 */

import https from 'https';

interface X402WellKnownResponse {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    outputSchema?: any;
    extra?: any;
  }>;
}

// In-memory cache for .well-known/x402 data
// Key: resource base URL, Value: { data, timestamp }
const wellKnownCache = new Map<
  string,
  { data: X402WellKnownResponse | null; timestamp: number }
>();

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Extract base URL from a full resource URL
 * Example: "https://example.com/api/weather?location=SF" -> "https://example.com"
 */
function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    console.error('[well-known] Invalid URL:', url, e);
    return url;
  }
}

/**
 * Fetch .well-known/x402 metadata from a resource
 * Results are cached for CACHE_DURATION to avoid repeated network calls
 *
 * @param resourceUrl - Full URL of the resource (e.g., "https://example.com/api/weather")
 * @returns The .well-known/x402 response data, or null if fetch fails
 */
export async function fetchWellKnown(
  resourceUrl: string
): Promise<X402WellKnownResponse | null> {
  const baseUrl = getBaseUrl(resourceUrl);
  const wellKnownUrl = `${baseUrl}/.well-known/x402`;

  // Check cache first
  const cached = wellKnownCache.get(baseUrl);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_DURATION) {
      console.log(`[well-known] Cache hit for ${baseUrl} (age: ${Math.round(age / 1000)}s)`);
      return cached.data;
    } else {
      console.log(`[well-known] Cache expired for ${baseUrl} (age: ${Math.round(age / 1000)}s)`);
    }
  }

  // Fetch from network
  try {
    console.log(`[well-known] Fetching ${wellKnownUrl}`);

    let response: Response;

    // In development mode and server-side, use custom HTTPS handling
    if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
      // For development: bypass SSL certificate verification using Node's https module
      response = await new Promise((resolve, reject) => {
        const url = new URL(wellKnownUrl);

        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          rejectUnauthorized: false, // Allow self-signed certificates in development
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            // Create a Response-like object
            resolve(new Response(data, {
              status: res.statusCode || 200,
              statusText: res.statusMessage || 'OK',
              headers: res.headers as any,
            }));
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        // Set timeout
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      });
    } else {
      // Production mode or client-side: use regular fetch
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      };

      response = await fetch(wellKnownUrl, fetchOptions);
    }

    if (!response.ok) {
      console.error(
        `[well-known] HTTP ${response.status} from ${wellKnownUrl}`
      );
      // Cache null result to avoid hammering failing endpoints
      wellKnownCache.set(baseUrl, {
        data: null,
        timestamp: Date.now(),
      });
      return null;
    }

    // Get the response text first to debug what we're receiving
    const responseText = await response.text();

    if (!responseText || responseText.trim() === '') {
      console.error(
        `[well-known] Empty response from ${wellKnownUrl}`
      );
      // Cache null result
      wellKnownCache.set(baseUrl, {
        data: null,
        timestamp: Date.now(),
      });
      return null;
    }

    let data: X402WellKnownResponse;
    try {
      data = JSON.parse(responseText) as X402WellKnownResponse;
    } catch (parseError) {
      console.error(
        `[well-known] Invalid JSON from ${wellKnownUrl}:`,
        parseError,
        'Response text:',
        responseText.substring(0, 500) // Log first 500 chars for debugging
      );
      // Cache null result
      wellKnownCache.set(baseUrl, {
        data: null,
        timestamp: Date.now(),
      });
      return null;
    }

    // Validate response structure
    if (!data.x402Version || !Array.isArray(data.accepts)) {
      console.error(
        '[well-known] Invalid x402 response structure:',
        data
      );
      wellKnownCache.set(baseUrl, {
        data: null,
        timestamp: Date.now(),
      });
      return null;
    }

    // Cache successful result
    wellKnownCache.set(baseUrl, {
      data,
      timestamp: Date.now(),
    });

    console.log(`[well-known] Successfully cached data for ${baseUrl}`);
    return data;
  } catch (error) {
    console.error(`[well-known] Error fetching ${wellKnownUrl}:`, error);
    // Cache null result to avoid repeated failed fetches
    wellKnownCache.set(baseUrl, {
      data: null,
      timestamp: Date.now(),
    });
    return null;
  }
}

/**
 * Extract the description field from .well-known/x402 data
 * Returns the description from the first matching resource entry, or null
 *
 * @param wellKnownData - The .well-known/x402 response data
 * @param resourcePath - Optional specific resource path to match
 */
export function extractDescription(
  wellKnownData: X402WellKnownResponse | null,
  resourcePath?: string
): string | null {
  if (!wellKnownData || !wellKnownData.accepts || wellKnownData.accepts.length === 0) {
    return null;
  }

  // If a specific resource path is provided, try to find exact match
  if (resourcePath) {
    const match = wellKnownData.accepts.find((entry) =>
      entry.resource?.includes(resourcePath)
    );
    if (match && match.description) {
      return match.description;
    }
  }

  // Otherwise, return the first description found
  const firstWithDescription = wellKnownData.accepts.find(
    (entry) => entry.description
  );
  return firstWithDescription?.description || null;
}

/**
 * Clear the entire cache (useful for testing or manual refresh)
 */
export function clearWellKnownCache(): void {
  wellKnownCache.clear();
  console.log('[well-known] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: wellKnownCache.size,
    entries: Array.from(wellKnownCache.entries()).map(([url, { timestamp }]) => ({
      url,
      age: Date.now() - timestamp,
      expired: Date.now() - timestamp > CACHE_DURATION,
    })),
  };
}
