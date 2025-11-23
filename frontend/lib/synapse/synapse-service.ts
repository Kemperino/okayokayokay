import { Synapse } from '@filoz/synapse-sdk';

/**
 * Data structure for request data to be uploaded to Filecoin
 */
export interface RequestDataPayload {
  version: string;
  request_id: string;
  timestamp: string;
  input: {
    path?: string;
    params?: Record<string, unknown> | null;
  };
  output: unknown;
}

/**
 * Result of uploading data to Filecoin
 */
export interface UploadResult {
  success: boolean;
  pieceCid?: string;
  error?: string;
}

// Singleton Synapse instance
let synapseInstance: Synapse | null = null;

/**
 * Get or create a Synapse instance for Filecoin Calibration testnet
 */
async function getSynapseInstance(): Promise<Synapse> {
  if (synapseInstance) {
    return synapseInstance;
  }

  const privateKey = process.env.FILECOIN_PRIVATE_KEY;
  const rpcURL = process.env.FILECOIN_RPC_URL;

  if (!privateKey) {
    throw new Error('FILECOIN_PRIVATE_KEY environment variable not set');
  }

  if (!rpcURL) {
    throw new Error('FILECOIN_RPC_URL environment variable not set');
  }

  console.log('[Synapse] Initializing Synapse SDK for Calibration testnet...');

  synapseInstance = await Synapse.create({
    privateKey,
    rpcURL,
  });

  console.log('[Synapse] Synapse SDK initialized successfully');
  return synapseInstance;
}

/**
 * Upload request data (input + output) to Filecoin via Synapse SDK
 *
 * @param requestId - The unique request ID (nonce from transferWithAuth)
 * @param inputData - The input data sent to the resource
 * @param outputData - The output data received from the resource
 * @returns Upload result with PieceCID or error
 */
export async function uploadRequestData(
  requestId: string,
  inputData: unknown,
  outputData: unknown
): Promise<UploadResult> {
  try {
    console.log(`[Synapse] Uploading request data for request ${requestId}...`);

    const synapse = await getSynapseInstance();

    // Create the payload structure
    const payload: RequestDataPayload = {
      version: '1.0',
      request_id: requestId,
      timestamp: new Date().toISOString(),
      input: inputData as RequestDataPayload['input'],
      output: outputData,
    };

    // Serialize to JSON and convert to Uint8Array
    const jsonString = JSON.stringify(payload, null, 2);
    const data = new TextEncoder().encode(jsonString);

    console.log(`[Synapse] Payload size: ${data.length} bytes`);

    // Upload to Filecoin
    const uploadTask = await synapse.storage.upload(data, {
      callbacks: {
        onUploadComplete: (pieceCid: unknown) => {
          console.log(`[Synapse] Upload complete. PieceCID: ${pieceCid}`);
        },
      },
    });

    // Get the PieceCID from the result - it's a property, not a method
    const pieceCid = uploadTask.pieceCid;

    console.log(`[Synapse] Successfully uploaded request data. PieceCID: ${pieceCid}`);

    return {
      success: true,
      pieceCid: String(pieceCid),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Synapse] Failed to upload request data: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Download request data from Filecoin by PieceCID
 *
 * @param pieceCid - The PieceCID of the data to download
 * @returns The request data payload or null if failed
 */
export async function downloadRequestData(
  pieceCid: string
): Promise<RequestDataPayload | null> {
  try {
    console.log(`[Synapse] Downloading data for PieceCID: ${pieceCid}...`);

    const synapse = await getSynapseInstance();

    const data = await synapse.download(pieceCid);

    if (!data) {
      console.error('[Synapse] No data returned from download');
      return null;
    }

    // Convert Uint8Array to string and parse JSON
    const text = new TextDecoder().decode(data);
    const payload = JSON.parse(text) as RequestDataPayload;

    console.log(`[Synapse] Successfully downloaded request data for request ${payload.request_id}`);
    return payload;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Synapse] Failed to download request data: ${errorMessage}`);
    return null;
  }
}

/**
 * Check the Synapse account balance and status
 * Useful for debugging and ensuring the wallet is funded
 */
export async function checkSynapseStatus(): Promise<{
  walletAddress: string;
  filBalance: string;
  usdfcBalance: string;
  paymentsBalance: string;
}> {
  const synapse = await getSynapseInstance();

  const signer = synapse.getSigner();
  const walletAddress = await signer.getAddress();

  // Get balances
  const filBalance = await synapse.payments.walletBalance();
  const usdfcBalance = await synapse.payments.walletBalance('USDFC');
  const paymentsBalance = await synapse.payments.balance();

  return {
    walletAddress,
    filBalance: filBalance.toString(),
    usdfcBalance: usdfcBalance.toString(),
    paymentsBalance: paymentsBalance.toString(),
  };
}
