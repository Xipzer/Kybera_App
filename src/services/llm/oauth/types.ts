/**
 * Code by Xipzer
 *
 * OAuth flow abstraction. Kybera is a pure client-side SPA, so authorization
 * codes return to a hosted static callback page which relays them back to the
 * app (via postMessage when opened as a popup, or a pasteable code otherwise).
 */

import type { ProviderId, OAuthTokens } from '../types'

export interface OAuthProviderConfig {
  provider: ProviderId
  clientId: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
  /** Hosted callback page that receives ?code&state and relays it back. */
  redirectUri: string
  /** Extra params appended to the authorize URL. */
  extraAuthParams?: Record<string, string>
  /** Some providers (Anthropic) fold state into the code as `code#state`. */
  stateInCode?: boolean
}

export interface AuthorizeSession {
  url: string
  verifier: string
  state: string
}

/** Result of exchanging an authorization code. */
export interface TokenExchangeResult {
  access: string
  refresh: string
  expires: number
}

export interface OAuthFlow {
  config: OAuthProviderConfig
  begin(): Promise<AuthorizeSession>
  exchange(codeInput: string, session: AuthorizeSession): Promise<OAuthTokens>
  refresh(refreshToken: string): Promise<OAuthTokens>
}
