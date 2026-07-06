/**
 * Code by Xipzer
 *
 * Kybera CORS proxy — a standalone service (deploy as a Render Web Service).
 *
 * app.kybera.xyz is a static SPA on Render, which can't run functions. Several
 * provider endpoints (Anthropic OAuth token exchange, OpenAI Codex Responses,
 * Polymarket) reject cross-origin browser requests, so the SPA calls them
 * same-origin under /api/* and Render rewrites those to THIS service, which
 * forwards them server-side (no CORS) and streams the response back with CORS
 * headers re-added.
 *
 * Render setup:
 *   1. Deploy this folder as a Web Service (build: `bun install`, start: `bun run start`).
 *   2. On the static site, add a Rewrite: /api/* -> https://<this-service>.onrender.com/api/*
 *
 * Runs on Bun (Hono) — matches Kybera's preferred stack.
 */

import { Hono } from 'hono'

const app = new Hono()

const ROUTES: [string, string][] = [
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

function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': ALLOW_HEADERS,
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

app.options('/api/*', (c) => {
  const origin = c.req.header('origin') || '*'
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
})

app.get('/health', (c) => c.text('ok'))

app.all('/api/*', async (c) => {
  const req = c.req.raw
  const url = new URL(req.url)
  const origin = req.header?.('origin') || c.req.header('origin') || '*'

  const route = ROUTES.find(([prefix]) => url.pathname.startsWith(prefix))
  if (!route) {
    return new Response('Not found', { status: 404, headers: corsHeaders(origin) })
  }

  const [prefix, upstreamBase] = route
  const rest = url.pathname.slice(prefix.length)
  const target = upstreamBase + rest + url.search

  const fwd = new Headers(req.headers)
  fwd.delete('origin')
  fwd.delete('referer')
  fwd.delete('host')
  fwd.delete('cookie')

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: fwd,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
      redirect: 'follow',
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: `Proxy fetch failed: ${String(err)}` }), {
      status: 502,
      headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const respHeaders = new Headers(upstream.headers)
  for (const [k, v] of Object.entries(corsHeaders(origin))) respHeaders.set(k, v)
  respHeaders.delete('content-encoding')
  respHeaders.delete('content-length')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  })
})

const port = Number(process.env.PORT) || 8787
export default { port, fetch: app.fetch }
