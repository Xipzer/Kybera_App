/**
 * Code by Xipzer
 *
 * PKCE (RFC 7636) helpers using the browser Web Crypto API. Shared by every
 * OAuth provider adapter.
 */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export interface PKCE {
  verifier: string
  challenge: string
}

export async function generatePKCE(): Promise<PKCE> {
  const verifierBytes = new Uint8Array(32)
  crypto.getRandomValues(verifierBytes)
  const verifier = base64UrlEncode(verifierBytes)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64UrlEncode(new Uint8Array(hash)) }
}

export function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}
