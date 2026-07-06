/**
 * Code by Xipzer
 *
 * PKCE authorization-code OAuth flow, copied from the pi-mono reference. Handles
 * the two providers' divergences (Anthropic: state=verifier + JSON token body;
 * OpenAI Codex: random state + form-urlencoded token body + extra params).
 */

import type { OAuthTokens } from '../types'
import type { AuthorizeSession, OAuthFlow, OAuthProviderConfig } from './types'
import { generatePKCE, randomState } from './pkce'

interface RawTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

/** Extract the ChatGPT account id from an OpenAI Codex OAuth JWT access token. */
function extractOpenAIAccountId(accessToken: string): string | undefined {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return undefined
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >
    const auth = json['https://api.openai.com/auth'] as { chatgpt_account_id?: string } | undefined
    return auth?.chatgpt_account_id
  } catch {
    return undefined
  }
}

/** Parse `code`, `code#state`, or a full redirect URL into { code, state }. */
export function parseCodeInput(input: string): { code: string; state: string } {
  const value = input.trim()
  try {
    const url = new URL(value)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (code) return { code, state: state ?? '' }
  } catch {
    // not a URL
  }
  if (value.includes('#')) {
    const [code = '', state = ''] = value.split('#', 2)
    return { code, state }
  }
  if (value.includes('code=')) {
    const params = new URLSearchParams(value)
    const code = params.get('code')
    if (code) return { code, state: params.get('state') ?? '' }
  }
  return { code: value, state: '' }
}

export class GenericOAuthFlow implements OAuthFlow {
  constructor(public config: OAuthProviderConfig) {}

  async begin(): Promise<AuthorizeSession> {
    const { verifier, challenge } = await generatePKCE()
    const state = this.config.stateIsVerifier ? verifier : randomState()

    // Preserve the exact param set/order the reference uses.
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      ...(this.config.extraAuthParams ?? {}),
    })

    return {
      url: `${this.config.authorizeUrl}?${params.toString()}`,
      verifier,
      state,
    }
  }

  async exchange(codeInput: string, session: AuthorizeSession): Promise<OAuthTokens> {
    const { code, state } = parseCodeInput(codeInput)
    if (state && state !== session.state) {
      throw new Error('OAuth state mismatch')
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: session.verifier,
    }
    // Anthropic requires `state` echoed in the token exchange; OpenAI does not.
    if (this.config.stateIsVerifier) body.state = state || session.state

    const data = await this.post(body)
    return {
      kind: 'oauth',
      access: data.access_token,
      refresh: data.refresh_token,
      expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
      ...(this.config.provider === 'openai'
        ? { accountId: extractOpenAIAccountId(data.access_token) }
        : {}),
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
      expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
      ...(this.config.provider === 'openai'
        ? { accountId: extractOpenAIAccountId(data.access_token) }
        : {}),
    }
  }

  private async post(body: Record<string, string>): Promise<RawTokenResponse> {
    const isForm = this.config.tokenBodyFormat === 'form'
    const res = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
        Accept: 'application/json',
      },
      body: isForm ? new URLSearchParams(body).toString() : JSON.stringify(body),
    })
    const text = await res.text().catch(() => '')
    if (!res.ok) {
      throw new Error(`OAuth token request failed (${res.status}): ${text || '(empty response)'}`)
    }
    if (!text) {
      // An empty 200 usually means the /api/* proxy isn't wired up (the request
      // isn't reaching the provider) rather than a real token error.
      throw new Error(
        `Token endpoint returned an empty response. The ${this.config.provider} token proxy ` +
          `(${this.config.tokenUrl}) is not forwarding requests — check the deployment proxy config.`,
      )
    }
    let json: RawTokenResponse
    try {
      json = JSON.parse(text) as RawTokenResponse
    } catch {
      throw new Error(`Token endpoint returned non-JSON: ${text.slice(0, 200)}`)
    }
    if (!json.access_token) {
      throw new Error(`Invalid token response: ${text.slice(0, 200)}`)
    }
    return json
  }
}
