/**
 * Script to check Filecoin wallet balance on Calibration testnet
 * Run with: npx tsx scripts/check-filecoin-wallet.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { ethers } from 'ethers';

const FILECOIN_RPC_URL = process.env.FILECOIN_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1';
const FILECOIN_PRIVATE_KEY = process.env.FILECOIN_PRIVATE_KEY;

// USDFC token address on Calibration testnet (from synapse-core)
const USDFC_ADDRESS = '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';

// ERC20 ABI for balance check
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function main() {
  if (!FILECOIN_PRIVATE_KEY) {
    console.error('FILECOIN_PRIVATE_KEY not set in .env.local');
    process.exit(1);
  }

  console.log('Checking Filecoin wallet on Calibration testnet...\n');

  const provider = new ethers.JsonRpcProvider(FILECOIN_RPC_URL);
  const wallet = new ethers.Wallet(FILECOIN_PRIVATE_KEY, provider);

  console.log('Wallet Address:', wallet.address);
  console.log('');

  // Check tFIL balance (native token)
  const filBalance = await provider.getBalance(wallet.address);
  const filBalanceFormatted = ethers.formatEther(filBalance);
  console.log(`tFIL Balance: ${filBalanceFormatted} tFIL`);

  // Check USDFC balance
  try {
    const usdfcContract = new ethers.Contract(USDFC_ADDRESS, ERC20_ABI, provider);
    const usdfcBalance = await usdfcContract.balanceOf(wallet.address);
    const usdfcDecimals = await usdfcContract.decimals();
    const usdfcBalanceFormatted = ethers.formatUnits(usdfcBalance, usdfcDecimals);
    console.log(`USDFC Balance: ${usdfcBalanceFormatted} USDFC`);
  } catch (error) {
    console.log('USDFC Balance: Could not fetch (contract may not exist at this address)');
  }

  console.log('');

  // Check if wallet has enough for operations
  const hasEnoughFil = parseFloat(filBalanceFormatted) > 0.1;

  if (hasEnoughFil) {
    console.log('✅ Wallet has tFIL for gas fees');
  } else {
    console.log('⚠️  Wallet needs more tFIL for gas fees');
    console.log('   Get tFIL from: https://faucet.calibnet.chainsafe-fil.io/');
  }

  // Get chain info
  const network = await provider.getNetwork();
  console.log('');
  console.log('Network Info:');
  console.log(`  Chain ID: ${network.chainId}`);
  console.log(`  RPC URL: ${FILECOIN_RPC_URL}`);
}

main().catch(console.error);
