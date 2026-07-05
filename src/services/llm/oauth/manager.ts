/**
 * Code by Xipzer
 *
 * OAuth session lifecycle: begin authorization (opens the provider login in a
 * new tab), complete via a pasted code / redirect URL, persist credentials, and
 * refresh access tokens on demand (deduplicated so concurrent requests share
 * one refresh).
 *
 * Because Kybera runs in the browser it cannot host the loopback callback the
 * CLI reference uses, so login is manual-paste: the provider redirects to its
 * registered loopback URI (which the browser cannot load), and the user copies
 * the code / full URL from the address bar back into Kybera.
 */

import { db } from '../../database'
import type { ProviderCredential, ProviderId, OAuthTokens } from '../types'
import type { AuthorizeSession, OAuthFlow } from './types'
import { GenericOAuthFlow } from './flow'
import { OAUTH_CONFIGS } from './configs'

const CRED_KEY = (p: ProviderId) => `llm.credential.${p}`

const flows = new Map<ProviderId, OAuthFlow>()

export function providerSupportsOAuth(provider: ProviderId): boolean {
  return !!OAUTH_CONFIGS[provider]
}

function getFlow(provider: ProviderId): OAuthFlow {
  const existing = flows.get(provider)
  if (existing) return existing
  const config = OAUTH_CONFIGS[provider]
  if (!config) {
    throw new Error(`${provider} does not support OAuth sign-in. Use an API key instead.`)
  }
  const flow = new GenericOAuthFlow(config)
  flows.set(provider, flow)
  return flow
}

export async function getStoredCredential(
  provider: ProviderId,
): Promise<ProviderCredential | null> {
  const row = await db.settings.get(CRED_KEY(provider))
  return (row?.value as ProviderCredential | undefined) ?? null
}

export async function storeCredential(
  provider: ProviderId,
  credential: ProviderCredential,
): Promise<void> {
  await db.settings.put({ key: CRED_KEY(provider), value: credential })
}

export async function clearCredential(provider: ProviderId): Promise<void> {
  await db.settings.delete(CRED_KEY(provider))
}

export function beginOAuth(provider: ProviderId): Promise<AuthorizeSession> {
  return getFlow(provider).begin()
}

export async function completeOAuth(
  provider: ProviderId,
  codeInput: string,
  session: AuthorizeSession,
): Promise<OAuthTokens> {
  const tokens = await getFlow(provider).exchange(codeInput, session)
  await storeCredential(provider, tokens)
  return tokens
}

const pendingRefresh = new Map<ProviderId, Promise<OAuthTokens>>()

/**
 * Return a usable credential, refreshing an expired OAuth access token first.
 * API-key credentials are returned as-is.
 */
export async function getUsableCredential(
  provider: ProviderId,
): Promise<ProviderCredential | null> {
  const cred = await getStoredCredential(provider)
  if (!cred) return null
  if (cred.kind === 'apikey') return cred
  if (cred.access && cred.expires > Date.now()) return cred

  const inFlight = pendingRefresh.get(provider)
  if (inFlight) return inFlight

  const refreshPromise = (async () => {
    const refreshed = await getFlow(provider).refresh(cred.refresh)
    await storeCredential(provider, refreshed)
    return refreshed
  })()
  pendingRefresh.set(provider, refreshPromise)
  try {
    return await refreshPromise
  } finally {
    pendingRefresh.delete(provider)
  }
}

/** Open the provider's login page in a new tab. */
export function openAuthPage(session: AuthorizeSession): Window | null {
  return window.open(session.url, '_blank', 'noopener,noreferrer')
}
