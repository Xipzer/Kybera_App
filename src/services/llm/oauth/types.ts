/**
 * Code by Xipzer
 *
 * OAuth flow abstraction, mirroring the pi-mono / Kimaki adapters exactly.
 *
 * Kybera is a browser SPA and cannot run the localhost callback server that the
 * CLI reference uses. Instead we use the manual-paste variant: the redirect_uri
 * stays the provider-REGISTERED loopback (so the authorize request is accepted),
 * the browser is sent there after login, and the user pastes the resulting code
 * (or full redirect URL) back into Kybera.
 */

import type { ProviderId, OAuthTokens } from '../types'

export interface OAuthProviderConfig {
  provider: ProviderId
  clientId: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
  /** Provider-registered redirect URI (a loopback). Must match exactly. */
  redirectUri: string
  /** Anthropic sends state = the PKCE verifier; OpenAI uses a random state. */
  stateIsVerifier: boolean
  /** OpenAI token endpoint expects form-urlencoded; Anthropic expects JSON. */
  tokenBodyFormat: 'json' | 'form'
  /** Extra params appended to the authorize URL (e.g. code=true, originator). */
  extraAuthParams?: Record<string, string>
}

export interface AuthorizeSession {
  url: string
  verifier: string
  state: string
}

export interface OAuthFlow {
  config: OAuthProviderConfig
  begin(originator?: string): Promise<AuthorizeSession>
  exchange(codeInput: string, session: AuthorizeSession): Promise<OAuthTokens>
  refresh(refreshToken: string): Promise<OAuthTokens>
}
