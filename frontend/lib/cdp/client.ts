import { CdpClient } from '@coinbase/cdp-sdk';

if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
  throw new Error('CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set in .env.local');
}

export const cdpClient = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
  walletSecret: process.env.CDP_WALLET_SECRET,
});
