import { createHmac } from 'crypto';

/**
 * Validates an Alchemy webhook signature using HMAC-SHA256
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The signature from the x-alchemy-signature header
 * @param signingKey - Your Alchemy webhook signing key
 * @returns true if signature is valid, false otherwise
 */
export function validateAlchemySignature(
  rawBody: string,
  signature: string | null,
  signingKey: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Compute HMAC-SHA256 of the raw body
    const hmac = createHmac('sha256', signingKey);
    hmac.update(rawBody, 'utf8');
    const computedSignature = hmac.digest('hex');

    // Compare with provided signature (constant-time comparison to prevent timing attacks)
    return timingSafeEqual(computedSignature, signature);
  } catch (error) {
    console.error('Error validating Alchemy signature:', error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
