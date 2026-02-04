/**
 * OpenClaw Gateway WebSocket Service
 * Connects to user's local OpenClaw instance for AI-powered token research
 * Version: 5 - Fixed keepalive to use Gateway protocol
 */

import {
  ResearchNetwork,
  OpenClawResearchUpdate,
  OpenClawResearchComplete,
  OpenClawError,
  ResearchChatMessage,
} from '../../types/research'

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

// Event types
export type OpenClawEventType =
  | 'connection_change'
  | 'research_started'
  | 'research_update'
  | 'research_complete'
  | 'research_error'
  | 'chat_message'
  | 'error'

export interface OpenClawEvent {
  type: OpenClawEventType
  data: unknown
}

// Listener callback type
type EventListener = (event: OpenClawEvent) => void

// Configuration
export interface OpenClawConfig {
  gatewayUrl: string
  authToken?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  pingInterval?: number
}

class OpenClawServiceClass {
  private ws: WebSocket | null = null
  private config: OpenClawConfig | null = null
  private connectionState: ConnectionState = 'disconnected'
  private listeners: Map<string, Set<EventListener>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private pingInterval: number | null = null
  // These may be used in future for session management
  // @ts-expect-error Reserved for future use
  private _pingIntervalMs = 30000
  // @ts-expect-error Reserved for future use  
  private _sessionId: string | null = null
  private pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  > = new Map()
  // Store research context (contract address, network) by request ID
  private researchContext: Map<string, { contractAddress: string; network: string }> = new Map()
  private connectPromise: Promise<void> | null = null
  private reconnectTimeout: number | null = null
  private isAuthenticated = false
  private _authResolve: (() => void) | null = null
  private _authReject: ((error: Error) => void) | null = null

  /**
   * Initialize the service with configuration
   */
  configure(config: OpenClawConfig): void {
    this.config = config
    this.maxReconnectAttempts = config.reconnectAttempts ?? 5
    this.reconnectDelay = config.reconnectDelay ?? 2000
    this._pingIntervalMs = config.pingInterval ?? 30000
  }

  /**
   * Connect to OpenClaw Gateway
   */
  async connect(): Promise<void> {
    if (!this.config?.gatewayUrl) {
      throw new Error('OpenClaw Gateway URL not configured')
    }

    // If already connected and authenticated, return immediately
    if (this.connectionState === 'connected' && this.isAuthenticated) {
      return
    }

    // If connection is in progress, return the existing promise
    if (this.connectPromise) {
      return this.connectPromise
    }

    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // If already connecting (without promise - shouldn't happen but safety check)
    if (this.connectionState === 'connecting') {
      return
    }

    // Set connecting state BEFORE creating promise to prevent race conditions
    this.setConnectionState('connecting')
    this.isAuthenticated = false

    // Create promise IMMEDIATELY and store it to prevent duplicate connects
    let resolveConnect: () => void
    let rejectConnect: (err: Error) => void
    this.connectPromise = new Promise((resolve, reject) => {
      resolveConnect = resolve
      rejectConnect = reject
    })

    // Now do the actual connection work
    try {
      // Build WebSocket URL with auth token if provided
      let rawUrl = this.config!.gatewayUrl.trim()
      
      // Convert http(s) to ws(s) if needed
      if (rawUrl.startsWith('http://')) {
        rawUrl = 'ws://' + rawUrl.slice(7)
      } else if (rawUrl.startsWith('https://')) {
        rawUrl = 'wss://' + rawUrl.slice(8)
      } else if (!rawUrl.startsWith('ws://') && !rawUrl.startsWith('wss://')) {
        // If no protocol, assume ws://
        rawUrl = 'ws://' + rawUrl
      }
      
      // Parse URL and add token if provided
      let wsUrl: string
      try {
        const url = new URL(rawUrl)
        if (this.config!.authToken) {
          url.searchParams.set('token', this.config!.authToken)
        }
        wsUrl = url.toString()
      } catch (urlError) {
        console.error('[OpenClaw] Invalid URL format:', rawUrl, urlError)
        this.setConnectionState('error')
        this.connectPromise = null
        rejectConnect!(new Error(`Invalid gateway URL: ${rawUrl}`))
        return
      }

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        // Don't set connected yet - wait for authentication
        this.reconnectAttempts = 0
        this.sendHandshake()
        // Don't resolve yet - wait for hello-ok
      }

      // Store resolve/reject for later use in handleMessage
      this._authResolve = () => {
        this.setConnectionState('connected')
        this.isAuthenticated = true
        this.startPingInterval()
        this.connectPromise = null
        resolveConnect!()
      }

      this._authReject = (error: Error) => {
        this.connectPromise = null
        this.setConnectionState('error')
        rejectConnect!(error)
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onerror = (error) => {
        console.error('[OpenClaw] WebSocket error:', error)
        this.emit('error', { message: 'WebSocket connection error' })
        // Reject the promise on error if still connecting
        if (this.connectionState === 'connecting' || !this.isAuthenticated) {
          this.connectPromise = null
          this.setConnectionState('error')
          if (this._authReject) {
            this._authReject(new Error('WebSocket connection failed'))
            this._authReject = null
            this._authResolve = null
          }
        }
      }

      this.ws.onclose = () => {
        this.stopPingInterval()

        if (this.connectionState !== 'disconnected') {
          this.handleDisconnection()
        }
      }
    } catch (error) {
      console.error('[OpenClaw] Connection error:', error)
      this.setConnectionState('error')
      this.connectPromise = null
      rejectConnect!(error instanceof Error ? error : new Error(String(error)))
    }

    // Return the promise that was already created
    return this.connectPromise!
  }

  /**
   * Disconnect from OpenClaw Gateway
   */
  disconnect(): void {
    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    this.setConnectionState('disconnected')
    this.stopPingInterval()
    this.isAuthenticated = false
    this.connectPromise = null
    this._authResolve = null
    this._authReject = null

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this._sessionId = null
    this.pendingRequests.clear()
    this.reconnectAttempts = 0
  }

  /**
   * Request token research
   */
  async requestResearch(contractAddress: string, network: ResearchNetwork): Promise<string> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    const researchId = this.generateId()

    // Use Gateway protocol format for 'agent' method
    // Required params: message, idempotencyKey, agentId
    const researchPrompt = `Research token: ${contractAddress} on ${network}

CRITICAL INSTRUCTIONS:
1. ALWAYS provide a COMPLETE structured response - never "you already asked" or abbreviated responses
2. This is a FRESH request - treat it as if you've never seen this token before

SKIP FOR LAUNCHPAD TOKENS (Clanker, Bankr, Virtuals, pump.fun, etc.):
- DO NOT include smart contract audit scores (GoPlus, QuickIntel, Token Sniffer, GT Score, Honeypot checks)
- These launchpads use centralized, audited factory contracts - audit scores are meaningless
- Focus ONLY on the developer and project, not the contract

DEVELOPER VERIFICATION (CRITICAL - GET THIS RIGHT):
- For launchpad tokens (Bankr, Clanker, etc.): the wallet that triggered deployment may NOT be the true owner
- Check if ownership/fees were transferred after launch - the TRUE OWNER is who receives fees or controls the project now
- RESOLVE ENS NAMES: If token name contains .eth, resolve it to find the true identity (e.g., clawd.atg.eth → atg.eth → Austin Griffith)
- The launcher (e.g., jessedixon) may be different from the identity the token represents (e.g., Austin Griffith/atg.eth)
- Research the PERSON behind the ENS/identity, not just the launcher account
- Verify Twitter/X, Farcaster, and other socials - find the REAL person's main accounts

DEEP RESEARCH REQUIRED:
- What is this person known for in the ecosystem?
- Previous projects they built (with outcomes - successes, failures, rugs)
- Their reputation in crypto-native circles vs mainstream
- Have they publicly acknowledged this token?
- Wallet history - have they rugged before?

ANALYSIS PRIORITIES (in order):
1. DEVELOPER/TEAM: Track record, previous projects (rugs/successes), doxxed status, reputation, wallet history
2. PRODUCT LEGITIMACY: Is this a LARP (fake/vaporware) or serious project? Can they actually deliver? Is there a working product?
3. SOCIAL & SMART MONEY: Smart wallet holdings, notable followers, KOL interest, organic vs botted engagement

QUANTITATIVE DATA TO INCLUDE:
- Buy/sell ratio (e.g., "10,092 sells vs 4,042 buys in 24H")
- Deployer wallet holdings (% of supply held, sold, or locked)
- Holder distribution concentration
- How this token ranks in the current meta (if applicable)

REQUIRED RESPONSE FORMAT (follow exactly):

**TokenName (SYMBOL)**

**Contract:** ${contractAddress}
**Network:** ${network}
**Launchpad:** [Clanker/Bankr/Virtuals/etc. with version if known]

**Market Data**
- **Price:** $X.XXXXX
- **Market Cap:** $X.XXM
- **Liquidity:** $X.XXM (main pool) / $X.XXM total reserve
- **24h Volume:** $X.XXM
- **24h Change:** +X% or -X%
- **24h Buys/Sells:** X,XXX buys / X,XXX sells
- **Holders:** X,XXX
- **Total Supply:** X.XXB TOKEN

**Developer/Team**

| Role | Address/Identity |
|------|------------------|
| Launcher | [Launchpad vX.X.X] ( 0x... ) |
| Original Admin | [username] (via [launchpad] admin parameter) |
| True Identity | [Real name/known identity if different from launcher] |
| ENS | [name.eth if applicable] |
| Farcaster | [@username](https://warpcast.com/username) |
| Twitter/X | [@username](https://x.com/username) |

- **Identity:** [WHO IS THIS PERSON - their background, what they're known for]
- **Notable work:** [Major projects they've built - e.g., "Creator of Scaffold-ETH", "ETH Foundation contributor"]
- **Product:** [what the token/project is for]
- **Previous projects:** [list with outcomes - successes/failures/rugs]
- **Reputation:** [crypto-native reputation, mainstream recognition]
- **Public acknowledgment:** [Has the dev publicly claimed this token? Yes/No/Unknown]

**Conviction Rating**

IMPORTANT: Rate based on INVESTMENT CONVICTION, not market volatility. All memecoins are volatile - that's expected.
Focus on: Is this dev/team trustworthy? Will they rug? Is the project legitimate?

Rating: SAFE / POTENTIAL / HIGH RISK / AVOID

Use these criteria:
- SAFE (🟩): Known reputable dev with proven track record, no red flags, legitimate project (e.g., ETH Foundation contributor, known builder with successful projects)
- POTENTIAL (🟨): Dev is identifiable but less established, or minor concerns exist - close to being safe
- HIGH RISK (🟧): Unknown dev, unverifiable claims, or significant concerns
- AVOID (🟥): Clear rug indicators, known scammer, severe red flags, or obvious scam

**Pros** (prioritize: dev reputation > product legitimacy > smart money interest)
🟩 **Pro title** — detailed explanation
🟩 **Pro title** — detailed explanation

**Cons** (prioritize: dev red flags > LARP indicators > low smart money interest)
🟥 **Con title** — detailed explanation
🟥 **Con title** — detailed explanation

**Summary**

2-3 sentence verdict stating the conviction level and primary reasoning. Compare to similar launches if relevant.`

    const request = {
      type: 'req',
      id: researchId,
      method: 'agent',
      params: {
        message: researchPrompt,
        idempotencyKey: researchId,
        agentId: 'main',
      },
    }

    // Store context for later use when parsing response
    this.researchContext.set(researchId, { contractAddress, network })
    
    this.sendRaw(request)
    this.emit('research_started', { researchId, contractAddress, network })

    return researchId
  }

  /**
   * Send a chat message (for follow-up questions about research)
   */
  async sendChatMessage(content: string, _researchId?: string): Promise<void> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    // Use Gateway protocol format for 'chat.send' method
    const msgId = this.generateId()
    const request = {
      type: 'req',
      id: msgId,
      method: 'chat.send',
      params: {
        message: content,
        idempotencyKey: msgId,
        agentId: 'main',
      },
    }

    this.sendRaw(request)
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected'
  }

  /**
   * Subscribe to events
   */
  on(event: OpenClawEventType | 'all', listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  /**
   * Remove event listener
   */
  off(event: OpenClawEventType | 'all', listener: EventListener): void {
    this.listeners.get(event)?.delete(listener)
  }

  // Private methods

  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState
    this.connectionState = state

    if (previousState !== state) {
      this.emit('connection_change', { previousState, currentState: state })
    }
  }

  private emit(type: OpenClawEventType, data: unknown): void {
    const event: OpenClawEvent = { type, data }

    // Emit to specific listeners
    this.listeners.get(type)?.forEach((listener) => listener(event))

    // Emit to 'all' listeners
    this.listeners.get('all')?.forEach((listener) => listener(event))
  }

  private sendRaw(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('[OpenClaw] Cannot send message: WebSocket not open')
    }
  }

  private sendHandshake(): void {
    // Don't send handshake immediately - wait for challenge
  }

  private handleChallenge(_nonce: string): void {
    // Send connect request following the Gateway WebSocket protocol
    // Use valid constant values for client.id and client.mode
    // Omit device object for local connections (it's optional)
    const connectRequest = {
      type: 'req',
      id: this.generateId(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'webchat-ui',
          version: '1.0.0',
          platform: 'linux',
          mode: 'ui',
        },
        auth: { token: this.config?.authToken || '' },
      },
    }
    const requestStr = JSON.stringify(connectRequest)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(requestStr)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      // Handle event-based messages (OpenClaw Gateway format)
      if (message.type === 'event') {
        switch (message.event) {
          case 'connect.challenge':
            this.handleChallenge(message.payload?.nonce)
            return
          case 'connect.success':
            this._sessionId = message.payload?.sessionId
            return
          case 'connect.error':
            console.error('[OpenClaw] Authentication failed:', message.payload?.message)
            this.emit('error', { message: message.payload?.message || 'Authentication failed' })
            return
          case 'agent':
            // Agent streaming event - could be lifecycle, text chunks, or completion
            const agentPayload = message.payload
            const runId = agentPayload?.runId
            
            if (agentPayload?.stream === 'lifecycle') {
              // Lifecycle events: start, end, error
              const phase = agentPayload.data?.phase
              if (phase === 'start') {
                this.emit('research_update', {
                  researchId: runId,
                  status: 'researching',
                  currentStep: 'AI agent started processing...',
                  progress: 20,
                })
              } else if (phase === 'end') {
                // Agent finished - the full response should come in text stream
              } else if (phase === 'error') {
                this.emit('research_error', {
                  researchId: runId,
                  message: agentPayload.data?.error || 'Agent error',
                })
              }
            } else if (agentPayload?.stream === 'assistant') {
              // Assistant text streaming - emit as chat message for live display
              const streamText = agentPayload?.data?.text
              if (streamText) {
                this.emit('chat_message', {
                  id: runId,
                  role: 'assistant',
                  content: streamText,
                  timestamp: new Date(),
                  isStreaming: true,
                })
                this.emit('research_update', {
                  researchId: runId,
                  status: 'researching',
                  currentStep: 'AI is generating analysis...',
                  progress: 50,
                })
              }
            } else if (agentPayload?.stream === 'text') {
              // Text streaming - accumulate or show progress
              this.emit('research_update', {
                researchId: runId,
                status: 'researching',
                currentStep: 'AI is generating analysis...',
                progress: 50,
              })
            } else if (agentPayload?.stream === 'result' || agentPayload?.text || agentPayload?.content) {
              // Final result
              this.handleAgentResponse(runId, agentPayload)
            }
            return
          case 'chat':
            // Chat event from agent - handles streaming deltas
            const chatPayload = message.payload
            
            // Extract text content from various possible structures:
            // 1. { message: { content: [{ type: "text", text: "..." }] } } - streaming format
            // 2. { message: string } or { text: string } - simple format
            let chatText: string | null = null
            
            if (chatPayload?.message?.content && Array.isArray(chatPayload.message.content)) {
              // Streaming format: extract text from content blocks array
              const textBlocks = chatPayload.message.content
                .filter((block: { type: string }) => block.type === 'text')
                .map((block: { text: string }) => block.text)
              chatText = textBlocks.join('')
            } else if (typeof chatPayload?.message === 'string') {
              chatText = chatPayload.message
            } else if (typeof chatPayload?.text === 'string') {
              chatText = chatPayload.text
            }
            
            if (chatText) {
              // Use runId as message id to allow updating the same message during streaming
              const messageId = chatPayload?.runId || `msg_${Date.now()}`
              this.emit('chat_message', {
                id: messageId,
                role: 'assistant',
                content: chatText,
                timestamp: new Date(),
                isStreaming: chatPayload?.state === 'delta',
              })
            }
            return
          default:
            // Unknown event type - ignore silently
        }
        return
      }

      // Handle response messages (Gateway protocol)
      if (message.type === 'res') {
        if (message.ok && message.payload?.type === 'hello-ok') {
          this._sessionId = message.id
          // Start ping/tick interval based on server policy
          if (message.payload?.policy?.tickIntervalMs) {
            this._pingIntervalMs = message.payload.policy.tickIntervalMs
          }
          // Resolve the connect promise
          if (this._authResolve) {
            this._authResolve()
            this._authResolve = null
            this._authReject = null
          }
          return
        } else if (message.ok && message.id) {
          // This is a response to an agent/chat request
          
          // Check if this is just an "accepted" acknowledgment (not the final response)
          if (message.payload?.status === 'accepted') {
            // Emit a progress update
            this.emit('research_update', {
              researchId: message.id,
              status: 'researching',
              currentStep: 'Request accepted, AI is processing...',
              progress: 10,
            })
            return
          }
          
          // If payload contains actual response data, process it
          if (message.payload && message.payload.status !== 'accepted') {
            this.handleAgentResponse(message.id, message.payload)
          }
          return
        } else if (!message.ok) {
          const errorMsg = message.error?.message || message.payload?.message || 'Request failed'
          console.error('[OpenClaw] Request failed:', errorMsg, 'id:', message.id)
          
          // Check if this is a connection rejection or a request error
          if (this._authReject && !this.isAuthenticated) {
            this._authReject(new Error(errorMsg))
            this._authReject = null
            this._authResolve = null
            if (this.ws) {
              this.ws.close(1000, 'Authentication failed')
            }
          } else if (message.id) {
            // This is an error response to a research/chat request
            this.emit('research_error', { 
              researchId: message.id, 
              message: errorMsg,
              code: message.error?.code 
            })
          } else {
            this.emit('error', { message: errorMsg })
          }
          return
        }
      }

      // Store session ID if provided
      if (message.sessionId) {
        this._sessionId = message.sessionId
      }

      switch (message.type) {
        case 'research_update':
          this.handleResearchUpdate(message.payload as OpenClawResearchUpdate)
          break

        case 'research_complete':
          this.handleResearchComplete(message.payload as OpenClawResearchComplete)
          break

        case 'chat':
          this.handleChatMessage(message.payload as ResearchChatMessage)
          break

        case 'error':
          this.handleError(message.payload as OpenClawError)
          break

        default:
          // Unknown message type - ignore silently
      }
    } catch (error) {
      console.error('[OpenClaw] Failed to parse message:', error)
    }
  }

  private handleResearchUpdate(update: OpenClawResearchUpdate): void {
    this.emit('research_update', update)
  }

  private handleResearchComplete(complete: OpenClawResearchComplete): void {
    this.emit('research_complete', complete)
  }

  private handleChatMessage(message: ResearchChatMessage): void {
    this.emit('chat_message', message)
  }

  private handleError(error: OpenClawError): void {
    console.error('[OpenClaw] Error:', error.code, error.message)

    if (error.researchId) {
      this.emit('research_error', error)
    } else {
      this.emit('error', error)
    }
  }

  /**
   * Handle agent response from Gateway
   * Parses the response and emits appropriate events
   */
  private handleAgentResponse(requestId: string, payload: unknown): void {
    const response = payload as Record<string, unknown>
    let responseText = ''
    
    // Handle various response formats:
    // 1. Final result: { result: { payloads: [{ text: "..." }, ...] } }
    // 2. Simple: { text: string } or { message: string } or { content: string }
    // 3. Stream data: { data: { text: "..." } }
    
    if (response.result && typeof response.result === 'object') {
      const result = response.result as Record<string, unknown>
      if (Array.isArray(result.payloads)) {
        // Combine all text payloads
        responseText = result.payloads
          .map((p: { text?: string }) => p.text || '')
          .filter(Boolean)
          .join('\n\n')
      }
    }
    
    // Fall back to other formats if no payloads found
    if (!responseText) {
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>
        responseText = String(data.text || data.message || data.content || '')
      } else {
        responseText = String(
          response.text || 
          response.message || 
          response.content ||
          response.response ||
          (typeof payload === 'string' ? payload : '')
        )
      }
    }
    
    // If still no text, stringify the payload for debugging
    if (!responseText) {
      console.warn('[OpenClaw] Could not extract text from response, using JSON')
      responseText = JSON.stringify(payload, null, 2)
    }
    
    // Emit as chat message for display
    this.emit('chat_message', {
      id: requestId,
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
      isStreaming: false,
    })
    
    // Parse the response to extract structured data if possible
    const research = this.parseResearchResponse(requestId, responseText)
    
    // Emit research complete event
    this.emit('research_complete', {
      researchId: requestId,
      research,
    })
  }

  /**
   * Parse agent response text into structured research data
   */
  private parseResearchResponse(researchId: string, responseText: string): Record<string, unknown> {
    // Try to extract key information from the markdown response
    const lines = responseText.split('\n')
    
    // Basic parsing - extract token name from headers
    let tokenName = 'Unknown Token'
    let tokenSymbol = '???'
    let marketCap = 0
    let price = 0
    const pros: string[] = []
    const cons: string[] = []
    let rating: 'green' | 'yellow' | 'orange' | 'red' = 'yellow'
    let explicitRatingFound = false
    let ratingReason = ''
    
    for (const line of lines) {
      // Only try to extract token name/symbol if we haven't found them yet
      if (tokenName === 'Unknown Token' || tokenSymbol === '???') {
        // Pattern 1: "## 🦑 **Squaer (SQUAER)**" or "**TokenName (SYMBOL)**"
        const tokenMatch1 = line.match(/\*\*([^(]+)\s*\(([^)]+)\)\*\*/)
        if (tokenMatch1) {
          tokenName = tokenMatch1[1]
            .trim()
            .replace(/^[#\s]+/, '')
            .replace(/[🦑🐸🚀💎🔥✨🌙⭐]/g, '')
            .trim()
          tokenSymbol = tokenMatch1[2].trim().replace(/\$/g, '')
        }

        // Pattern 2: "# TokenName ($SYMBOL)" or "## TokenName ($SYMBOL)"
        const tokenMatch2 = line.match(/^#+\s*([^($]+)\s*\(\$?([A-Z0-9]+)\)/i)
        if (tokenMatch2 && tokenName === 'Unknown Token') {
          tokenName = tokenMatch2[1]
            .trim()
            .replace(/[🦑🐸🚀💎🔥✨🌙⭐]/g, '')
            .trim()
          tokenSymbol = tokenMatch2[2].trim()
        }

        // Pattern 3: "Token: NAME" or "Name: TOKEN"
        const tokenMatch3 = line.match(/(?:Token|Name):\s*\*?\*?([^(,\n]+)/i)
        if (tokenMatch3 && tokenName === 'Unknown Token') {
          tokenName = tokenMatch3[1].trim().replace(/\*\*/g, '')
        }

        // Pattern 4: "Symbol: $SYMBOL" or "Ticker: SYMBOL"
        const tokenMatch4 = line.match(/(?:Symbol|Ticker):\s*\$?([A-Z0-9]+)/i)
        if (tokenMatch4 && tokenSymbol === '???') {
          tokenSymbol = tokenMatch4[1].trim()
        }

        // Pattern 5: Look for $SYMBOL anywhere in header lines
        if (line.startsWith('#') && tokenSymbol === '???') {
          const symbolMatch = line.match(/\$([A-Z0-9]{2,10})/i)
          if (symbolMatch) {
            tokenSymbol = symbolMatch[1].toUpperCase()
          }
        }
      }

      // Look for market cap - multiple patterns
      const mcapMatch = line.match(/Market\s*Cap[^\d]*\$?([\d,.]+)\s*([KMB])?/i)
      if (mcapMatch && marketCap === 0) {
        marketCap = this.parseNumber(mcapMatch[1] + (mcapMatch[2] || ''))
      }

      // Look for price - multiple patterns
      const priceMatch = line.match(/(?:Price|Current Price)[^\d]*\$?([\d.]+(?:e[+-]?\d+)?)/i)
      if (priceMatch && price === 0) {
        price = parseFloat(priceMatch[1])
      }

      // Look for rating keywords
      const lineLower = line.toLowerCase()

      // Rating keywords (matches prompt format: SAFE / POTENTIAL / HIGH RISK / AVOID)
      // Only explicit "Rating:" patterns should set the rating definitively
      // Also extract the rating reason (text after the rating indicator)
      const ratingMatch = line.match(
        /(?:Rating:\s*)?(?:🟩\s*SAFE|🟨\s*POTENTIAL|🟧\s*HIGH\s*RISK|🟥\s*AVOID)\s*[—\-–:]*\s*(.*)/i,
      )
      if (ratingMatch && ratingMatch[1]) {
        ratingReason = ratingMatch[1].trim()
      }

      if (
        lineLower.includes('rating: safe') ||
        lineLower.includes('🟩 safe') ||
        (lineLower.includes('safe') && lineLower.includes('rating'))
      ) {
        rating = 'green'
        explicitRatingFound = true
      } else if (
        lineLower.includes('rating: potential') ||
        lineLower.includes('🟨 potential') ||
        (lineLower.includes('potential') && lineLower.includes('rating'))
      ) {
        rating = 'yellow'
        explicitRatingFound = true
      } else if (
        lineLower.includes('rating: high risk') ||
        lineLower.includes('🟧 high risk') ||
        (lineLower.includes('high risk') && lineLower.includes('rating'))
      ) {
        rating = 'orange'
        explicitRatingFound = true
      } else if (
        lineLower.includes('rating: avoid') ||
        lineLower.includes('🟥 avoid') ||
        (lineLower.includes('avoid') && lineLower.includes('rating'))
      ) {
        rating = 'red'
        explicitRatingFound = true
      }
      // Fallback keywords without "rating:" prefix - only use if no explicit rating found yet
      else if (!explicitRatingFound) {
        if (lineLower.includes('avoid') && !lineLower.includes('to avoid')) {
          rating = 'red'
        } else if (lineLower.includes('high risk')) {
          rating = 'orange'
        } else if (lineLower.includes('low risk') || lineLower.includes('safe bet')) {
          rating = 'green'
        }
      }

      // Look for red flags as cons (🟥 red square, ❌, 🚨, ⚠️)
      if (
        line.includes('🟥') ||
        line.includes('🚨') ||
        line.includes('Red Flag') ||
        line.includes('⚠️') ||
        line.includes('❌')
      ) {
        const text = line
          .replace(/[🟥🚨⚠️❌]/g, '')
          .replace(/\*\*/g, '')
          .replace(/^[-*]\s*/, '')
          .trim()
        if (text.length > 5 && !cons.includes(text)) cons.push(text)
      }

      // Look for green checkmarks as pros (🟩 green square, ✅, ✓)
      if (line.includes('🟩') || line.includes('✅') || line.includes('✓')) {
        const text = line
          .replace(/[🟩✅✓]/g, '')
          .replace(/\*\*/g, '')
          .replace(/^[-*]\s*/, '')
          .trim()
        if (text.length > 5 && !pros.includes(text)) pros.push(text)
      }
    }
    
    // Get the stored context for this research
    const context = this.researchContext.get(researchId)
    
    // Clean up the stored context
    this.researchContext.delete(researchId)
    
    return {
      id: researchId,
      contractAddress: context?.contractAddress || '',
      network: context?.network || 'unknown',
      tokenName,
      tokenSymbol,
      marketCap,
      price,
      pros: pros.slice(0, 5),
      cons: cons.slice(0, 5),
      rating,
      ratingReason,
      timestamp: new Date(),
      status: 'completed',
      rawResponse: responseText,
      sources: [],
    }
  }

  /**
   * Parse number strings like "257K" or "1.5M" into numbers
   */
  private parseNumber(str: string): number {
    const num = parseFloat(str.replace(/[,$]/g, ''))
    if (str.toUpperCase().includes('K')) return num * 1000
    if (str.toUpperCase().includes('M')) return num * 1000000
    if (str.toUpperCase().includes('B')) return num * 1000000000
    return num
  }

  private handleDisconnection(): void {
    // Don't reconnect if we were never authenticated (auth failure)
    if (!this.isAuthenticated && this.reconnectAttempts === 0) {
      this.setConnectionState('error')
      return
    }
    
    // Clear existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    this.isAuthenticated = false
    this.connectPromise = null
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setConnectionState('reconnecting')
      this.reconnectAttempts++

      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectTimeout = null
        this.connect().catch(() => {
          // Reconnection failed - will be handled by next attempt
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      this.setConnectionState('error')
    }
  }

  private startPingInterval(): void {
    // Server sends tick events for keepalive, so we don't need client-side pings
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// Use global to survive HMR (Hot Module Replacement)
declare global {
  // eslint-disable-next-line no-var
  var __openClawServiceInstance: OpenClawServiceClass | undefined
  // eslint-disable-next-line no-var
  var __openClawModuleId: string | undefined
}

// Generate a unique ID for this module load
const MODULE_ID = `${Date.now()}_${Math.random().toString(36).slice(2)}`

// If there's an existing instance from a different module load, disconnect it first
if (globalThis.__openClawServiceInstance && globalThis.__openClawModuleId !== MODULE_ID) {
  globalThis.__openClawServiceInstance.disconnect()
}

// Export singleton instance (survives HMR)
export const OpenClawService = globalThis.__openClawServiceInstance ?? new OpenClawServiceClass()
globalThis.__openClawServiceInstance = OpenClawService
globalThis.__openClawModuleId = MODULE_ID

// Vite HMR cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    OpenClawService.disconnect()
  })
}

// Export class for testing
export { OpenClawServiceClass }
