/**
 * Code by Xipzer
 *
 * Vercel catch-all serverless proxy for the LLM providers + their OAuth token
 * endpoints. app.kybera.xyz is a static SPA; several provider endpoints
 * (Anthropic OAuth token exchange, OpenAI Codex Responses API) reject
 * cross-origin browser requests, so the app calls them same-origin under /api/*
 * and this function forwards them server-side and streams the response back.
 *
 * As a Vercel catch-all route (api/[...path].js) it receives every /api/* path
 * verbatim in request.url, so no vercel.json rewrites are needed for the API —
 * only the SPA fallback lives in vercel.json.
 *
 * Mirrors the existing Polymarket-proxy pattern.
 */

export const config = { runtime: 'edge' }

const ROUTES = [
  ['/api/anthropic-token', 'https://platform.claude.com/v1/oauth/token'],
  ['/api/anthropic', 'https://api.anthropic.com'],
  ['/api/openai-token', 'https://auth.openai.com/oauth/token'],
  ['/api/openai-codex', 'https://chatgpt.com/backend-api/codex'],
  ['/api/openai', 'https://api.openai.com'],
  ['/api/xai', 'https://api.x.ai'],
  ['/api/coingecko', 'https://api.coingecko.com'],
  ['/api/polymarket', 'https://gamma-api.polymarket.com'],
]

const ALLOW_HEADERS =
  'content-type, authorization, anthropic-version, anthropic-beta, ' +
  'anthropic-dangerous-direct-browser-access, x-api-key, x-app, user-agent, ' +
  'openai-beta, chatgpt-account-id, originator, accept'

function cors(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': ALLOW_HEADERS,
    'access-control-max-age': '86400',
  }
}

export default async function handler(request) {
  const url = new URL(request.url)
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) })
  }

  const route = ROUTES.find(([prefix]) => url.pathname.startsWith(prefix))
  if (!route) return new Response('Not found', { status: 404, headers: cors(origin) })

  const [prefix, upstreamBase] = route
  const rest = url.pathname.slice(prefix.length)
  const target = upstreamBase + rest + url.search

  const fwd = new Headers(request.headers)
  fwd.delete('origin')
  fwd.delete('referer')
  fwd.delete('host')
  fwd.delete('cookie')

  let upstream
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: fwd,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'follow',
      duplex: 'half',
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: `Proxy fetch failed: ${String(err)}` }), {
      status: 502,
      headers: { 'content-type': 'application/json', ...cors(origin) },
    })
  }

  const respHeaders = new Headers(upstream.headers)
  for (const [k, v] of Object.entries(cors(origin))) respHeaders.set(k, v)
  respHeaders.delete('content-encoding')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  })
}
