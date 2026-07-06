/**
 * Code by Xipzer
 *
 * Kybera CORS proxy — a standalone Node service (deploy as a Render Web Service,
 * runtime: Node). Zero dependencies so it runs on any Node runtime without a
 * build step.
 *
 * app.kybera.xyz is a static SPA on Render, which can't run functions. Several
 * provider endpoints (Anthropic OAuth token exchange, OpenAI Codex Responses,
 * Polymarket) reject cross-origin browser requests, so the SPA calls them
 * same-origin under /api/* and this service forwards them server-side (no CORS)
 * and streams the response back with CORS headers re-added.
 *
 * Render setup:
 *   Root Directory: proxy
 *   Build Command: (leave empty — no deps)
 *   Start Command: node index.js
 *   Health Check Path: /health
 * Then on the static site add a Rewrite: /api/* -> https://<this-service>/api/*
 */

import http from 'node:http'
import { Readable } from 'node:stream'

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

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': ALLOW_HEADERS,
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', () => resolve(Buffer.alloc(0)))
  })
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '*'
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin))
    res.end()
    return
  }

  const route = ROUTES.find(([prefix]) => url.pathname.startsWith(prefix))
  if (!route) {
    res.writeHead(404, corsHeaders(origin))
    res.end('Not found')
    return
  }

  const [prefix, upstreamBase] = route
  const rest = url.pathname.slice(prefix.length)
  const target = upstreamBase + rest + url.search

  const fwdHeaders = { ...req.headers }
  delete fwdHeaders.origin
  delete fwdHeaders.referer
  delete fwdHeaders.host
  delete fwdHeaders.cookie
  delete fwdHeaders['content-length']

  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)

  let upstream
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body: body && body.length ? body : undefined,
      redirect: 'follow',
    })
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json', ...corsHeaders(origin) })
    res.end(JSON.stringify({ error: `Proxy fetch failed: ${String(err)}` }))
    return
  }

  const outHeaders = corsHeaders(origin)
  upstream.headers.forEach((value, key) => {
    if (key === 'content-encoding' || key === 'content-length' || key === 'transfer-encoding') {
      return
    }
    outHeaders[key] = value
  })

  res.writeHead(upstream.status, outHeaders)
  if (upstream.body) {
    Readable.fromWeb(upstream.body).pipe(res)
  } else {
    res.end()
  }
})

const port = Number(process.env.PORT) || 10000
server.listen(port, () => {
  console.log(`kybera-proxy listening on :${port}`)
})
