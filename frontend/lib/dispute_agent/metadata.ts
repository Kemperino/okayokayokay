/**
 * Fetches and parses service metadata from a given URI
 */

export interface ServiceMetadata {
  name?: string;
  description?: string;
  category?: string;
  pricing?: any;
  terms?: string;
  endpoints?: any[];
  [key: string]: any; // Allow additional fields
}

/**
 * Fetches service metadata from a URI
 * Supports both HTTP/HTTPS URLs and IPFS URIs
 */
export async function fetchServiceMetadata(metadataURI: string): Promise<ServiceMetadata | null> {
  try {
    if (!metadataURI) {
      console.log('No metadata URI provided');
      return null;
    }

    let url = metadataURI;

    // Handle IPFS URIs
    if (metadataURI.startsWith('ipfs://')) {
      const ipfsHash = metadataURI.replace('ipfs://', '');
      url = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
    }

    // Handle Arweave URIs
    if (metadataURI.startsWith('ar://')) {
      const arweaveId = metadataURI.replace('ar://', '');
      url = `https://arweave.net/${arweaveId}`;
    }

    console.log(`Fetching metadata from: ${url}`);

    // Fetch the metadata
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type');

    // Parse JSON metadata
    if (contentType?.includes('application/json')) {
      const metadata = await response.json();
      return metadata as ServiceMetadata;
    }

    // Try to parse as JSON even if content-type is different
    const text = await response.text();
    try {
      const metadata = JSON.parse(text);
      return metadata as ServiceMetadata;
    } catch {
      // If not JSON, return the text content as description
      return {
        description: text.substring(0, 1000) // Limit to 1000 chars
      };
    }
  } catch (error) {
    console.error('Error fetching service metadata:', error);
    return null;
  }
}

/**
 * Formats service metadata for inclusion in LLM prompt
 */
export function formatMetadataForPrompt(metadata: ServiceMetadata | null): string {
  if (!metadata) {
    return 'Service metadata not available';
  }

  const sections: string[] = [];

  if (metadata.name) {
    sections.push(`Service Name: ${metadata.name}`);
  }

  if (metadata.description) {
    sections.push(`Service Description: ${metadata.description}`);
  }

  if (metadata.category) {
    sections.push(`Category: ${metadata.category}`);
  }

  if (metadata.pricing) {
    sections.push(`Pricing: ${JSON.stringify(metadata.pricing, null, 2)}`);
  }

  if (metadata.terms) {
    sections.push(`Terms of Service: ${metadata.terms}`);
  }

  if (metadata.endpoints && Array.isArray(metadata.endpoints)) {
    sections.push(`Available Endpoints: ${metadata.endpoints.length}`);
    // Include first few endpoints as examples
    const endpointExamples = metadata.endpoints.slice(0, 3).map(ep =>
      typeof ep === 'string' ? ep : JSON.stringify(ep)
    ).join(', ');
    if (endpointExamples) {
      sections.push(`Example Endpoints: ${endpointExamples}`);
    }
  }

  return sections.join('\n');
}
