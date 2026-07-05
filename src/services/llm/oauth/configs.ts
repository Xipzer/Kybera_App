/**
 * Code by Xipzer
 *
 * Per-provider OAuth endpoint configuration. Anthropic values mirror the
 * Claude Code CLI PKCE flow (public client). OpenAI and xAI use their standard
 * authorization-code + PKCE endpoints.
 *
 * The redirect URI points at Kybera's hosted callback relay so the pure
 * client-side SPA can complete OAuth without a backend.
 */

import type { ProviderId } from '../types'
import type { OAuthProviderConfig } from './types'

const CALLBACK_URL = 'https://app.kybera.xyz/callback'

// Anthropic Claude Code public OAuth client (base64 to keep it out of naive scrapes).
const ANTHROPIC_CLIENT_ID = atob('OWQxYzI1MGEtZTYxYi00NGQ5LTg4ZWQtNTk0NGQxOTYyZjVl')

export const OAUTH_CONFIGS: Partial<Record<ProviderId, OAuthProviderConfig>> = {
  anthropic: {
    provider: 'anthropic',
    clientId: ANTHROPIC_CLIENT_ID,
    authorizeUrl: 'https://claude.ai/oauth/authorize',
    tokenUrl: 'https://platform.claude.com/v1/oauth/token',
    scopes: 'user:profile user:inference',
    redirectUri: CALLBACK_URL,
    extraAuthParams: { code: 'true' },
    stateInCode: true,
  },
  openai: {
    provider: 'openai',
    // OpenAI's ChatGPT/Codex OAuth public client id.
    clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
    authorizeUrl: 'https://auth.openai.com/oauth/authorize',
    tokenUrl: 'https://auth.openai.com/oauth/token',
    scopes: 'openid profile email offline_access',
    redirectUri: CALLBACK_URL,
  },
  xai: {
    provider: 'xai',
    // Placeholder client id — set once xAI's OAuth app is registered.
    clientId: 'kybera-xai',
    authorizeUrl: 'https://accounts.x.ai/oauth/authorize',
    tokenUrl: 'https://accounts.x.ai/oauth/token',
    scopes: 'inference offline_access',
    redirectUri: CALLBACK_URL,
  },
}
