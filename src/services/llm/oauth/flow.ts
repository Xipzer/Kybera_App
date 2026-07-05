/**
 * Code by Xipzer
 *
 * Generic PKCE authorization-code OAuth flow. Provider-specific endpoints and
 * quirks are supplied via OAuthProviderConfig.
 */

import type { OAuthTokens } from '../types'
import type { AuthorizeSession, OAuthFlow, OAuthProviderConfig } from './types'
import { generatePKCE, randomState } from './pkce'

/** Refresh 5 minutes before the real expiry to avoid mid-request failures. */
function tokenExpiry(expiresIn: number): number {
  return Date.now() + expiresIn * 1000 - 5 * 60 * 1000
}

interface RawTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

/** Parse `code`, `code#state`, or a full redirect URL into { code, state }. */
export function parseCodeInput(input: string): { code: string; state: string } {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (code) return { code, state: state ?? '' }
  } catch {
    // not a URL
  }
  if (trimmed.includes('#')) {
    const [code = '', state = ''] = trimmed.split('#', 2)
    return { code, state }
  }
  if (trimmed.includes('code=')) {
    const params = new URLSearchParams(trimmed)
    const code = params.get('code')
    if (code) return { code, state: params.get('state') ?? '' }
  }
  return { code: trimmed, state: '' }
}

export class GenericOAuthFlow implements OAuthFlow {
  constructor(public config: OAuthProviderConfig) {}

  async begin(): Promise<AuthorizeSession> {
    const pkce = await generatePKCE()
    const state = this.config.stateInCode ? pkce.verifier : randomState()

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      state,
      ...(this.config.extraAuthParams ?? {}),
    })

    return {
      url: `${this.config.authorizeUrl}?${params.toString()}`,
      verifier: pkce.verifier,
      state,
    }
  }

  async exchange(codeInput: string, session: AuthorizeSession): Promise<OAuthTokens> {
    const { code, state } = parseCodeInput(codeInput)
    const data = await this.post({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: session.verifier,
      state: state || session.state,
    })
    return {
      kind: 'oauth',
      access: data.access_token,
      refresh: data.refresh_token,
      expires: tokenExpiry(data.expires_in),
    }
  }

  async refresh(refreshToken: string): Promise<OAuthTokens> {
    const data = await this.post({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    })
    return {
      kind: 'oauth',
      access: data.access_token,
      refresh: data.refresh_token || refreshToken,
      expires: tokenExpiry(data.expires_in),
    }
  }

  private async post(body: Record<string, string>): Promise<RawTokenResponse> {
    const res = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`OAuth token request failed (${res.status}): ${text}`)
    }
    const json = (await res.json()) as RawTokenResponse
    if (!json.access_token) {
      throw new Error(`Invalid token response: ${JSON.stringify(json)}`)
    }
    return json
  }
}
