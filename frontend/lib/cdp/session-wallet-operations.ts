import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

// USDC contract on Base Mainnet
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_DECIMALS = 6;

// Create a public client for reading blockchain data
// Use custom RPC URL if provided, otherwise fall back to default
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || undefined),
});

/**
 * Get USDC balance for an anonymous session wallet
 */
export async function getSessionUsdcBalance(sessionId: string): Promise<string> {
  const { wallet } = await import('./session-wallet').then(m => m.getOrCreateAnonymousWallet(sessionId));

  // Read USDC balance using viem public client
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: [wallet.wallet_address as `0x${string}`],
  });

  // Format to human-readable amount
  return formatUnits(balance as bigint, USDC_DECIMALS);
}

/**
 * Get native ETH balance for an anonymous session wallet
 */
export async function getSessionEthBalance(sessionId: string): Promise<string> {
  const { wallet } = await import('./session-wallet').then(m => m.getOrCreateAnonymousWallet(sessionId));

  // Get ETH balance using viem public client
  const balance = await publicClient.getBalance({
    address: wallet.wallet_address as `0x${string}`,
  });

  // Format to ETH (18 decimals)
  return formatUnits(balance, 18);
}

/**
 * Get wallet address for a session
 */
export async function getSessionWalletAddress(sessionId: string): Promise<string> {
  const { wallet } = await import('./session-wallet').then(m => m.getOrCreateAnonymousWallet(sessionId));
  return wallet.wallet_address;
}
