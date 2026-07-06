/**
 * Code by Xipzer
 *
 * Per-provider OAuth endpoint configuration — copied verbatim from the pi-mono
 * reference the Kimaki adapter is built on:
 *   packages/ai/src/utils/oauth/anthropic.ts
 *   packages/ai/src/utils/oauth/openai-codex.ts
 *
 * The redirect URIs are the providers' REGISTERED loopback callbacks. They must
 * be sent exactly as-is in both the authorize request and the token exchange,
 * or the provider rejects the client ("Redirect URI ... is not supported").
 *
 * xAI (Grok) has no public OAuth client — it is API-key only (see providers).
 */

import type { ProviderId } from '../types'
import type { OAuthProviderConfig } from './types'

// Anthropic Claude Code public OAuth client (base64 to keep it out of naive scrapes).
const ANTHROPIC_CLIENT_ID = atob('OWQxYzI1MGEtZTYxYi00NGQ5LTg4ZWQtNTk0NGQxOTYyZjVl')

export const OAUTH_CONFIGS: Partial<Record<ProviderId, OAuthProviderConfig>> = {
  anthropic: {
    provider: 'anthropic',
    clientId: ANTHROPIC_CLIENT_ID,
    // The authorize URL is a top-level browser navigation (no CORS) — direct.
    authorizeUrl: 'https://claude.ai/oauth/authorize',
    // The token exchange is an XHR that the provider blocks cross-origin, so it
    // goes through the same-origin proxy (vite in dev, Render rewrite in prod).
    tokenUrl: '/api/anthropic-token',
    scopes:
      'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload',
    redirectUri: 'http://localhost:53692/callback',
    stateIsVerifier: true,
    tokenBodyFormat: 'json',
    extraAuthParams: { code: 'true' },
  },
  openai: {
    provider: 'openai',
    clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
    authorizeUrl: 'https://auth.openai.com/oauth/authorize',
    tokenUrl: '/api/openai-token',
    scopes: 'openid profile email offline_access',
    redirectUri: 'http://localhost:1455/auth/callback',
    stateIsVerifier: false,
    tokenBodyFormat: 'form',
    extraAuthParams: {
      id_token_add_organizations: 'true',
      codex_cli_simplified_flow: 'true',
      originator: 'codex_cli_rs',
    },
  },
}
