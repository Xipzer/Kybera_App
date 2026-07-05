/**
 * Code by Xipzer
 *
 * Cloudflare Worker — same-origin CORS proxy for the LLM providers and their
 * OAuth token endpoints. app.kybera.xyz is a static SPA; several provider
 * endpoints (Anthropic OAuth token, OpenAI Codex Responses) reject cross-origin
 * browser requests, so the app calls them via /api/* on its own origin and this
 * worker forwards them server-side (no CORS from the browser's perspective).
 *
 * Deploy this worker and point the app's /api/* rewrites at it, OR run it as a
 * route on the app's domain. Matches the existing Polymarket-proxy pattern.
 *
 * Route map (path prefix -> upstream):
 *   /api/anthropic-token  -> https://platform.claude.com/v1/oauth/token
 *   /api/anthropic/*      -> https://api.anthropic.com/*
 *   /api/openai-token     -> https://auth.openai.com/oauth/token
 *   /api/openai-codex/*   -> https://chatgpt.com/backend-api/codex/*
 *   /api/openai/*         -> https://api.openai.com/*
 *   /api/xai/*            -> https://api.x.ai/*
 */

const ROUTES = [
  ['/api/anthropic-token', 'https://platform.claude.com/v1/oauth/token'],
  ['/api/anthropic', 'https://api.anthropic.com'],
  ['/api/openai-token', 'https://auth.openai.com/oauth/token'],
  ['/api/openai-codex', 'https://chatgpt.com/backend-api/codex'],
  ['/api/openai', 'https://api.openai.com'],
  ['/api/xai', 'https://api.x.ai'],
]

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers':
      'content-type, authorization, anthropic-version, anthropic-beta, ' +
      'anthropic-dangerous-direct-browser-access, x-api-key, x-app, user-agent, ' +
      'openai-beta, chatgpt-account-id, originator, accept',
    'access-control-max-age': '86400',
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || '*'

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const route = ROUTES.find(([prefix]) => url.pathname.startsWith(prefix))
    if (!route) return new Response('Not found', { status: 404 })

    const [prefix, upstreamBase] = route
    const rest = url.pathname.slice(prefix.length)
    const target = upstreamBase + rest + url.search

    // Forward the request, stripping browser-only/CORS headers.
    const fwdHeaders = new Headers(request.headers)
    fwdHeaders.delete('origin')
    fwdHeaders.delete('referer')
    fwdHeaders.delete('host')

    const upstream = await fetch(target, {
      method: request.method,
      headers: fwdHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'follow',
    })

    // Re-emit the response with permissive CORS so the SPA can read it.
    const respHeaders = new Headers(upstream.headers)
    const cors = corsHeaders(origin)
    for (const [k, v] of Object.entries(cors)) respHeaders.set(k, v)

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    })
  },
}
