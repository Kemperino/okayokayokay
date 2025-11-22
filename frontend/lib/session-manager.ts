'use client';

const SESSION_KEY = 'x402_session_id';

/**
 * Get or create a persistent session ID
 * Stored in localStorage for persistence across page reloads
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateSessionId can only be called on the client side');
  }

  // Try to get existing session ID
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // Create new session ID
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Clear the current session (creates new wallet on next access)
 */
export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

/**
 * Get the current session ID (if it exists)
 */
export function getSessionId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(SESSION_KEY);
}
