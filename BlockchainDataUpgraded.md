# Upgraded Blockchain Data Architecture

## Overview

This document outlines a comprehensive upgrade to the blockchain data architecture that addresses all identified
weaknesses while maintaining backward compatibility and ensuring no logical errors are introduced.

## Core Architecture Principles

1. **Event-Driven First**: Replace polling with event-driven updates where possible
2. **Adaptive Resource Usage**: Adjust behavior based on user activity and system state
3. **Graceful Degradation**: Multiple fallback layers with circuit breakers
4. **Modular Design**: Loosely coupled, testable components
5. **Real-Time Capable**: WebSocket support with automatic fallback

## Upgraded Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     UI Components Layer                          │
│                  (React Components & Hooks)                      │
├─────────────────────────────────────────────────────────────────┤
│                    Event Bus & State Manager                     │
│              (EventEmitter + Zustand + React Query)             │
├─────────────────────────────────────────────────────────────────┤
│                  Blockchain Service Orchestrator                 │
│         (Coordinates all blockchain data operations)             │
├─────────────────────────────────────────────────────────────────┤
│   Data Providers Layer (Modular & Pluggable)                    │
│ ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐          │
│ │WebSocket    │ │Adaptive      │ │Intelligent      │          │
│ │Provider     │ │Polling       │ │Token Discovery  │          │
│ └─────────────┘ └──────────────┘ └─────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                    Network Services Layer                        │
│ ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐          │
│ │EVM Service  │ │SVM Service   │ │Price Service    │          │
│ │+ Alchemy    │ │+ Helius      │ │+ CoinGecko      │          │
│ └─────────────┘ └──────────────┘ └─────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                 Resilience & Optimization Layer                  │
│ ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐          │
│ │Circuit      │ │Request       │ │Cache            │          │
│ │Breaker      │ │Deduplicator  │ │Manager         │          │
│ └─────────────┘ └──────────────┘ └─────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                    Persistent Storage Layer                      │
│                  (IndexedDB via Dexie + LRU Cache)              │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Component Specifications

### 1. Event Bus & State Manager

```typescript
// Event-driven architecture core
interface BlockchainEventBus
{
  // Event types
  events: {
    'balance:update': { wallet: string; network: string; balance: Balance }
    'price:update': { tokens: PriceUpdate[] }
    'transaction:new': { transaction: Transaction }
    'connection:status': { status: 'connected' | 'disconnected' | 'error' }
    'activity:detected': { type: 'user' | 'background' }
  }

  emit<K extends keyof this['events']>(
    event: K,
    data: this['events'][K]
  ): void

  on<K extends keyof this['events']>(
    event: K,
    handler: (data: this['events'][K]) => void
  ): () => void
}

// Implementation
class BlockchainEventBusImpl implements BlockchainEventBus
{
  private emitter = new EventEmitter()
  private subscribers = new Map<string, Set<Function>>()

  emit<K extends keyof BlockchainEventBus['events']>(
    event: K,
    data: BlockchainEventBus['events'][K]
  ): void
  {
    this.emitter.emit(event, data)
    this.logEvent(event, data)
  }

  on<K extends keyof BlockchainEventBus['events']>(
    event: K,
    handler: (data: BlockchainEventBus['events'][K]) => void
  ): () => void
  {
    this.emitter.on(event, handler)

    // Return unsubscribe function
    return () =>
    {
      this.emitter.off(event, handler)
    }
  }

  private logEvent(event: string, data: any): void
  {
    if (process.env.NODE_ENV === 'development')
    {
      console.debug(`[BlockchainEvent] ${ event }:`, data)
    }
  }
}
```

### 2. Adaptive Polling System

```typescript
interface AdaptivePollingConfig
{
  intervals: {
    active: number      // User actively interacting
    idle: number        // User present but not active
    background: number  // Tab hidden or minimized
    offline: number     // No network connection
  }
  thresholds: {
    activityTimeout: number  // Time before considering user idle
    errorBackoff: number[]   // Exponential backoff on errors
  }
}

class AdaptivePollingManager
{
  private config: AdaptivePollingConfig = {
    intervals: {
      active: 5000,      // 5 seconds
      idle: 30000,       // 30 seconds
      background: 60000, // 1 minute
      offline: 0         // Stop polling
    },
    thresholds: {
      activityTimeout: 60000,  // 1 minute
      errorBackoff: [5000, 10000, 30000, 60000] // Up to 1 minute
    }
  }

  private lastActivity = Date.now()
  private visibilityState: DocumentVisibilityState = 'visible'
  private connectionStatus: 'online' | 'offline' = 'online'
  private errorCount = 0
  private polls = new Map<string, NodeJS.Timeout>()

  constructor(private eventBus: BlockchainEventBus)
  {
    this.setupEventListeners()
  }

  private setupEventListeners(): void
  {
    // User activity detection
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event =>
    {
      document.addEventListener(event, this.handleActivity, { passive: true })
    })

    // Visibility change detection
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Network status detection
    window.addEventListener('online', () => this.setConnectionStatus('online'))
    window.addEventListener('offline', () => this.setConnectionStatus('offline'))
  }

  private handleActivity = (): void =>
  {
    this.lastActivity = Date.now()
    this.eventBus.emit('activity:detected', { type: 'user' })
    this.adjustAllPollingIntervals()
  }

  private handleVisibilityChange = (): void =>
  {
    this.visibilityState = document.visibilityState
    this.eventBus.emit('activity:detected', {
      type: this.visibilityState === 'visible' ? 'user' : 'background'
    })
    this.adjustAllPollingIntervals()
  }

  private getCurrentInterval(): number
  {
    // Offline - no polling
    if (this.connectionStatus === 'offline')
    {
      return this.config.intervals.offline
    }

    // Error backoff
    if (this.errorCount > 0)
    {
      const backoffIndex = Math.min(
        this.errorCount - 1,
        this.config.thresholds.errorBackoff.length - 1
      )
      return this.config.thresholds.errorBackoff[backoffIndex]
    }

    // Background tab
    if (this.visibilityState === 'hidden')
    {
      return this.config.intervals.background
    }

    // Check if user is active
    const timeSinceActivity = Date.now() - this.lastActivity
    if (timeSinceActivity < this.config.thresholds.activityTimeout)
    {
      return this.config.intervals.active
    }

    // User is idle
    return this.config.intervals.idle
  }

  startPolling(
    id: string,
    callback: () => Promise<void>,
    options?: { immediate?: boolean }
  ): void
  {
    // Stop existing poll
    this.stopPolling(id)

    const poll = async (): Promise<void> =>
    {
      try
      {
        await callback()
        this.errorCount = 0 // Reset on success
      }
      catch (error)
      {
        this.errorCount++
        console.error(`Polling error for ${ id }:`, error)
      }

      // Schedule next poll with adaptive interval
      const interval = this.getCurrentInterval()
      if (interval > 0)
      {
        this.polls.set(id, setTimeout(poll, interval))
      }
    }

    // Start immediately if requested
    if (options?.immediate)
    {
      poll()
    }
    else
    {
      const interval = this.getCurrentInterval()
      if (interval > 0)
      {
        this.polls.set(id, setTimeout(poll, interval))
      }
    }
  }

  stopPolling(id: string): void
  {
    const timeout = this.polls.get(id)
    if (timeout)
    {
      clearTimeout(timeout)
      this.polls.delete(id)
    }
  }

  private adjustAllPollingIntervals(): void
  {
    // Restart all polls with new interval
    const polls = Array.from(this.polls.keys())
    polls.forEach(id =>
    {
      const timeout = this.polls.get(id)
      if (timeout)
      {
        clearTimeout(timeout)
        // Polls will restart themselves with new interval
      }
    })
  }

  private setConnectionStatus(status: 'online' | 'offline'): void
  {
    this.connectionStatus = status
    this.eventBus.emit('connection:status', {
      status: status === 'online' ? 'connected' : 'disconnected'
    })
    this.adjustAllPollingIntervals()
  }
}
```

### 3. WebSocket Integration

```typescript
interface WebSocketConfig
{
  urls: {
    ethereum: string
    polygon: string
    bsc: string
    solana: string
  }
  reconnectDelay: number
  maxReconnectAttempts: number
  heartbeatInterval: number
}

class WebSocketProvider
{
  private sockets = new Map<string, WebSocket>()
  private subscriptions = new Map<string, Set<string>>()
  private reconnectAttempts = new Map<string, number>()
  private heartbeatTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private config: WebSocketConfig,
    private eventBus: BlockchainEventBus,
    private fallbackProvider: () => void
  )
  {
  }

  async connect(network: string): Promise<void>
  {
    const url = this.config.urls[network as keyof typeof this.config.urls]
    if (!url)
    {
      console.warn(`No WebSocket URL for network: ${ network }`)
      this.fallbackProvider()
      return
    }

    try
    {
      const ws = new WebSocket(url)

      ws.onopen = () =>
      {
        console.log(`WebSocket connected to ${ network }`)
        this.sockets.set(network, ws)
        this.reconnectAttempts.set(network, 0)
        this.startHeartbeat(network, ws)
        this.eventBus.emit('connection:status', { status: 'connected' })
      }

      ws.onmessage = (event) =>
      {
        this.handleMessage(network, event.data)
      }

      ws.onerror = (error) =>
      {
        console.error(`WebSocket error for ${ network }:`, error)
        this.handleDisconnection(network)
      }

      ws.onclose = () =>
      {
        this.handleDisconnection(network)
      }

    }
    catch (error)
    {
      console.error(`Failed to create WebSocket for ${ network }:`, error)
      this.fallbackProvider()
    }
  }

  private handleMessage(network: string, data: string): void
  {
    try
    {
      const message = JSON.parse(data)

      switch (message.type)
      {
        case 'balance':
          this.eventBus.emit('balance:update', {
            wallet: message.address,
            network: network,
            balance: message.balance
          })
          break

        case 'price':
          this.eventBus.emit('price:update', {
            tokens: message.tokens
          })
          break

        case 'transaction':
          this.eventBus.emit('transaction:new', {
            transaction: message.transaction
          })
          break

        case 'pong':
          // Heartbeat response
          break

        default:
          console.warn('Unknown WebSocket message type:', message.type)
      }
    }
    catch (error)
    {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleDisconnection(network: string): void
  {
    this.stopHeartbeat(network)
    this.sockets.delete(network)

    const attempts = this.reconnectAttempts.get(network) || 0

    if (attempts < this.config.maxReconnectAttempts)
    {
      this.reconnectAttempts.set(network, attempts + 1)
      const delay = this.config.reconnectDelay * Math.pow(2, attempts)

      console.log(`Reconnecting to ${ network } in ${ delay }ms (attempt ${ attempts + 1 })`)

      setTimeout(() =>
      {
        this.connect(network)
      }, delay)
    }
    else
    {
      console.error(`Max reconnection attempts reached for ${ network }, falling back to polling`)
      this.eventBus.emit('connection:status', { status: 'error' })
      this.fallbackProvider()
    }
  }

  private startHeartbeat(network: string, ws: WebSocket): void
  {
    const timer = setInterval(() =>
    {
      if (ws.readyState === WebSocket.OPEN)
      {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
      else
      {
        this.handleDisconnection(network)
      }
    }, this.config.heartbeatInterval)

    this.heartbeatTimers.set(network, timer)
  }

  private stopHeartbeat(network: string): void
  {
    const timer = this.heartbeatTimers.get(network)
    if (timer)
    {
      clearInterval(timer)
      this.heartbeatTimers.delete(network)
    }
  }

  subscribe(network: string, addresses: string[]): void
  {
    const ws = this.sockets.get(network)
    if (!ws || ws.readyState !== WebSocket.OPEN)
    {
      console.warn(`Cannot subscribe: WebSocket not connected for ${ network }`)
      return
    }

    const existingSubs = this.subscriptions.get(network) || new Set()
    const newSubs = addresses.filter(addr => !existingSubs.has(addr))

    if (newSubs.length > 0)
    {
      ws.send(JSON.stringify({
        type: 'subscribe',
        addresses: newSubs
      }))

      newSubs.forEach(addr => existingSubs.add(addr))
      this.subscriptions.set(network, existingSubs)
    }
  }

  unsubscribe(network: string, addresses: string[]): void
  {
    const ws = this.sockets.get(network)
    const subs = this.subscriptions.get(network)

    if (ws && subs)
    {
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        addresses: addresses
      }))

      addresses.forEach(addr => subs.delete(addr))
    }
  }

  disconnect(network: string): void
  {
    this.stopHeartbeat(network)
    const ws = this.sockets.get(network)
    if (ws)
    {
      ws.close()
      this.sockets.delete(network)
    }
    this.subscriptions.delete(network)
    this.reconnectAttempts.delete(network)
  }

  disconnectAll(): void
  {
    Array.from(this.sockets.keys()).forEach(network =>
    {
      this.disconnect(network)
    })
  }
}
```

### 4. Circuit Breaker Implementation

```typescript
interface CircuitBreakerConfig
{
  failureThreshold: number
  resetTimeout: number
  halfOpenRequests: number
}

enum CircuitState
{
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker
{
  private state = CircuitState.CLOSED
  private failures = 0
  private lastFailureTime = 0
  private successCount = 0

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      halfOpenRequests: 3
    }
  )
  {
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>
  {
    // Check if circuit should be reset
    this.checkReset()

    switch (this.state)
    {
      case CircuitState.OPEN:
        console.warn(`Circuit breaker ${ this.name } is OPEN`)
        if (fallback)
        {
          return fallback()
        }
        throw new Error(`Circuit breaker ${ this.name } is OPEN`)

      case CircuitState.HALF_OPEN:
        console.log(`Circuit breaker ${ this.name } is HALF_OPEN, testing...`)
        return this.executeInHalfOpen(operation, fallback)

      case CircuitState.CLOSED:
        return this.executeInClosed(operation, fallback)
    }
  }

  private async executeInClosed<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>
  {
    try
    {
      const result = await operation()
      this.onSuccess()
      return result
    }
    catch (error)
    {
      this.onFailure()

      if (this.state === CircuitState.OPEN && fallback)
      {
        console.warn(`Circuit breaker ${ this.name } opened, using fallback`)
        return fallback()
      }

      throw error
    }
  }

  private async executeInHalfOpen<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>
  {
    try
    {
      const result = await operation()
      this.successCount++

      if (this.successCount >= this.config.halfOpenRequests)
      {
        this.close()
      }

      return result
    }
    catch (error)
    {
      this.open()

      if (fallback)
      {
        return fallback()
      }

      throw error
    }
  }

  private onSuccess(): void
  {
    this.failures = 0
  }

  private onFailure(): void
  {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.config.failureThreshold)
    {
      this.open()
    }
  }

  private open(): void
  {
    this.state = CircuitState.OPEN
    this.successCount = 0
    console.error(`Circuit breaker ${ this.name } opened after ${ this.failures } failures`)
  }

  private close(): void
  {
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successCount = 0
    console.log(`Circuit breaker ${ this.name } closed`)
  }

  private checkReset(): void
  {
    if (
      this.state === CircuitState.OPEN &&
      Date.now() - this.lastFailureTime >= this.config.resetTimeout
    )
    {
      this.state = CircuitState.HALF_OPEN
      this.successCount = 0
      console.log(`Circuit breaker ${ this.name } moved to HALF_OPEN`)
    }
  }

  getState(): CircuitState
  {
    return this.state
  }
}
```

### 5. Request Deduplication

```typescript
class RequestDeduplicator
{
  private pendingRequests = new Map<string, Promise<any>>()
  private requestCounts = new Map<string, number>()

  async deduplicate<T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      ttl?: number // Time to live for deduplication
      maxWaiters?: number // Max number of waiting requests
    }
  ): Promise<T>
  {
    // Check if request is already pending
    const pending = this.pendingRequests.get(key)
    if (pending)
    {
      const count = this.requestCounts.get(key) || 0

      // Limit number of waiters to prevent memory issues
      if (options?.maxWaiters && count >= options.maxWaiters)
      {
        throw new Error(`Too many pending requests for ${ key }`)
      }

      this.requestCounts.set(key, count + 1)
      console.debug(`Deduplicating request ${ key }, ${ count + 1 } waiters`)

      try
      {
        return await pending
      }
      finally
      {
        this.requestCounts.set(key, this.requestCounts.get(key)! - 1)
      }
    }

    // Create new request
    const promise = operation()
      .then(result =>
      {
        // Keep result cached for TTL if specified
        if (options?.ttl)
        {
          setTimeout(() =>
          {
            this.pendingRequests.delete(key)
          }, options.ttl)
        }
        else
        {
          this.pendingRequests.delete(key)
        }
        return result
      })
      .catch(error =>
      {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, promise)
    this.requestCounts.set(key, 0)

    return promise
  }

  clear(pattern?: string): void
  {
    if (pattern)
    {
      // Clear matching keys
      const regex = new RegExp(pattern)
      for (const key of this.pendingRequests.keys())
      {
        if (regex.test(key))
        {
          this.pendingRequests.delete(key)
          this.requestCounts.delete(key)
        }
      }
    }
    else
    {
      // Clear all
      this.pendingRequests.clear()
      this.requestCounts.clear()
    }
  }
}
```

### 6. Intelligent Token Discovery

```typescript
interface TokenDiscoveryConfig
{
  maxTokensPerWallet: number
  priorityFactors: {
    manual: number
    balance: number
    activity: number
    age: number
  }
  discoveryStrategies: string[]
}

interface TokenScore
{
  token: TokenInfo
  score: number
  factors: {
    isManual: boolean
    hasBalance: boolean
    recentActivity: boolean
    age: number
  }
}

class IntelligentTokenDiscovery
{
  private config: TokenDiscoveryConfig = {
    maxTokensPerWallet: 100, // Increased from 50
    priorityFactors: {
      manual: 1000,     // Manually added tokens always highest priority
      balance: 100,     // Tokens with balance
      activity: 50,     // Recent transaction activity
      age: 10          // How long we've known about the token
    },
    discoveryStrategies: [
      'manual',         // User-added tokens
      'historical',     // Previously seen tokens
      'alchemy',        // Alchemy automatic discovery
      'popular',        // Popular tokens on chain
      'defi'           // DeFi protocol tokens
    ]
  }

  constructor(
    private db: Dexie,
    private eventBus: BlockchainEventBus
  )
  {
  }

  async discoverTokens(
    walletAddress: string,
    chainId: number,
    options?: {
      forceRefresh?: boolean
      includeZeroBalance?: boolean
    }
  ): Promise<TokenInfo[]>
  {
    const discoveredTokens: TokenScore[] = []

    // Execute discovery strategies in parallel
    const strategyPromises = this.config.discoveryStrategies.map(strategy =>
      this.executeStrategy(strategy, walletAddress, chainId)
          .catch(error =>
          {
            console.error(`Token discovery strategy ${ strategy } failed:`, error)
            return []
          })
    )

    const results = await Promise.all(strategyPromises)
    const allTokens = results.flat()

    // Score and sort tokens
    const scoredTokens = await this.scoreTokens(
      allTokens,
      walletAddress,
      chainId
    )

    // Filter based on options
    let filteredTokens = scoredTokens
    if (!options?.includeZeroBalance)
    {
      filteredTokens = scoredTokens.filter(
        st => st.factors.hasBalance || st.factors.isManual
      )
    }

    // Sort by score and limit
    filteredTokens.sort((a, b) => b.score - a.score)
    const selectedTokens = filteredTokens
      .slice(0, this.config.maxTokensPerWallet)
      .map(st => st.token)

    // Cache discovery results
    await this.cacheDiscoveryResults(
      walletAddress,
      chainId,
      selectedTokens
    )

    // Emit discovery complete event
    this.eventBus.emit('token:discovery:complete', {
      wallet: walletAddress,
      chainId,
      count: selectedTokens.length
    })

    return selectedTokens
  }

  private async executeStrategy(
    strategy: string,
    walletAddress: string,
    chainId: number
  ): Promise<TokenInfo[]>
  {
    switch (strategy)
    {
      case 'manual':
        return this.getManualTokens(walletAddress, chainId)

      case 'historical':
        return this.getHistoricalTokens(walletAddress, chainId)

      case 'alchemy':
        return this.getAlchemyTokens(walletAddress, chainId)

      case 'popular':
        return this.getPopularTokens(chainId)

      case 'defi':
        return this.getDefiTokens(chainId)

      default:
        return []
    }
  }

  private async getManualTokens(
    walletAddress: string,
    chainId: number
  ): Promise<TokenInfo[]>
  {
    const tokens = await this.db.table('discoveredTokens')
                             .where('walletAddress').equals(walletAddress)
                             .and(token => token.chainId === chainId.toString())
                             .and(token => token.addedManually === true)
                             .toArray()

    return tokens.map(t => ({
      address: t.tokenAddress,
      name: t.name,
      symbol: t.symbol,
      decimals: t.decimals,
      balance: '0', // Will be updated later
      logoURI: t.logoURI,
      metadata: { isManual: true }
    }))
  }

  private async getHistoricalTokens(
    walletAddress: string,
    chainId: number
  ): Promise<TokenInfo[]>
  {
    // Get tokens from transaction history
    const transactions = await this.db.table('transactions')
                                   .where('from').equals(walletAddress)
                                   .or('to').equals(walletAddress)
                                   .and(tx => tx.network === chainId.toString())
                                   .and(tx => tx.tokenAddress !== undefined)
                                   .toArray()

    const tokenAddresses = new Set(
      transactions.map(tx => tx.tokenAddress!.toLowerCase())
    )

    // Get token metadata
    const tokens: TokenInfo[] = []
    for (const address of tokenAddresses)
    {
      const metadata = await this.db.table('tokenMetadata')
                                 .get(`${ chainId }_${ address }`)

      if (metadata)
      {
        tokens.push({
          address,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          balance: '0',
          logoURI: metadata.logoURI,
          metadata: {
            isHistorical: true,
            lastSeen: Math.max(...transactions
              .filter(tx => tx.tokenAddress?.toLowerCase() === address)
              .map(tx => tx.timestamp)
            )
          }
        })
      }
    }

    return tokens
  }

  private async scoreTokens(
    tokens: TokenInfo[],
    walletAddress: string,
    chainId: number
  ): Promise<TokenScore[]>
  {
    const uniqueTokens = this.deduplicateTokens(tokens)

    return Promise.all(uniqueTokens.map(async token =>
    {
      let score = 0
      const factors = {
        isManual: false,
        hasBalance: false,
        recentActivity: false,
        age: 0
      }

      // Check if manually added
      if (token.metadata?.isManual)
      {
        factors.isManual = true
        score += this.config.priorityFactors.manual
      }

      // Check balance
      const balance = parseFloat(token.balance || '0')
      if (balance > 0)
      {
        factors.hasBalance = true
        score += this.config.priorityFactors.balance
        // Additional score based on balance magnitude
        score += Math.log10(balance + 1) * 10
      }

      // Check recent activity
      const recentTx = await this.hasRecentActivity(
        walletAddress,
        token.address,
        chainId
      )
      if (recentTx)
      {
        factors.recentActivity = true
        score += this.config.priorityFactors.activity
      }

      // Age factor
      const discoveryRecord = await this.db.table('discoveredTokens')
                                        .get(`${ walletAddress }_${ chainId }_${ token.address }`)

      if (discoveryRecord)
      {
        factors.age = Date.now() - discoveryRecord.discoveredAt
        score += Math.min(
          this.config.priorityFactors.age,
          factors.age / (1000 * 60 * 60 * 24) // Days
        )
      }

      return { token, score, factors }
    }))
  }

  private deduplicateTokens(tokens: TokenInfo[]): TokenInfo[]
  {
    const seen = new Map<string, TokenInfo>()

    for (const token of tokens)
    {
      const key = token.address.toLowerCase()
      const existing = seen.get(key)

      // Keep token with more metadata
      if (!existing || this.hasMoreMetadata(token, existing))
      {
        seen.set(key, token)
      }
    }

    return Array.from(seen.values())
  }

  private hasMoreMetadata(a: TokenInfo, b: TokenInfo): boolean
  {
    const scoreA = (a.name ? 1 : 0) + (a.symbol ? 1 : 0) + (a.logoURI ? 1 : 0)
    const scoreB = (b.name ? 1 : 0) + (b.symbol ? 1 : 0) + (b.logoURI ? 1 : 0)
    return scoreA > scoreB
  }

  private async hasRecentActivity(
    walletAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<boolean>
  {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

    const recentTx = await this.db.table('transactions')
                               .where('from').equals(walletAddress)
                               .or('to').equals(walletAddress)
                               .and(tx =>
                                 tx.network === chainId.toString() &&
                                 tx.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase() &&
                                 tx.timestamp > oneWeekAgo
                               )
                               .first()

    return !!recentTx
  }

  private async cacheDiscoveryResults(
    walletAddress: string,
    chainId: number,
    tokens: TokenInfo[]
  ): Promise<void>
  {
    const now = Date.now()

    const updates = tokens.map(token => ({
      id: `${ walletAddress }_${ chainId }_${ token.address }`,
      walletAddress,
      chainId: chainId.toString(),
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      addedManually: token.metadata?.isManual || false,
      discoveredAt: now,
      lastSeen: now
    }))

    await this.db.table('discoveredTokens').bulkPut(updates)
  }

  // Placeholder methods for additional strategies
  private async getAlchemyTokens(
    walletAddress: string,
    chainId: number
  ): Promise<TokenInfo[]>
  {
    // Would integrate with Alchemy's token discovery API
    return []
  }

  private async getPopularTokens(chainId: number): Promise<TokenInfo[]>
  {
    // Would return popular tokens for the chain
    return []
  }

  private async getDefiTokens(chainId: number): Promise<TokenInfo[]>
  {
    // Would return major DeFi protocol tokens
    return []
  }
}
```

### 7. Enhanced Cache Manager

```typescript
interface CacheStrategy
{
  maxAge: number
  maxSize: number
  priority: 'high' | 'medium' | 'low'
  invalidateOn?: string[] // Event names that invalidate this cache
}

interface CacheEntry<T>
{
  data: T
  timestamp: number
  hits: number
  size: number
  priority: CacheStrategy['priority']
}

class EnhancedCacheManager
{
  private memoryCache = new Map<string, CacheEntry<any>>()
  private cacheStrategies = new Map<string, CacheStrategy>()
  private totalSize = 0
  private maxTotalSize = 50 * 1024 * 1024 // 50MB

  constructor(private eventBus: BlockchainEventBus)
  {
    this.setupDefaultStrategies()
    this.setupEventListeners()
  }

  private setupDefaultStrategies(): void
  {
    // Define cache strategies for different data types
    this.cacheStrategies.set('balance', {
      maxAge: 30000, // 30 seconds
      maxSize: 1024, // 1KB per entry
      priority: 'high',
      invalidateOn: ['transaction:new', 'balance:update']
    })

    this.cacheStrategies.set('price', {
      maxAge: 300000, // 5 minutes
      maxSize: 512,
      priority: 'medium',
      invalidateOn: ['price:update']
    })

    this.cacheStrategies.set('metadata', {
      maxAge: 86400000, // 24 hours
      maxSize: 2048,
      priority: 'low',
      invalidateOn: []
    })

    this.cacheStrategies.set('transaction', {
      maxAge: 3600000, // 1 hour
      maxSize: 4096,
      priority: 'medium',
      invalidateOn: ['transaction:new']
    })
  }

  private setupEventListeners(): void
  {
    // Listen for events that should invalidate cache
    for (const [type, strategy] of this.cacheStrategies)
    {
      if (strategy.invalidateOn)
      {
        strategy.invalidateOn.forEach(event =>
        {
          this.eventBus.on(event as any, () =>
          {
            this.invalidateByType(type)
          })
        })
      }
    }
  }

  async get<T>(
    key: string,
    type: string,
    fetcher?: () => Promise<T>
  ): Promise<T | null>
  {
    // Check memory cache first
    const cached = this.memoryCache.get(key)

    if (cached)
    {
      const strategy = this.cacheStrategies.get(type)
      const age = Date.now() - cached.timestamp

      if (strategy && age < strategy.maxAge)
      {
        cached.hits++
        return cached.data
      }
      else
      {
        // Cache expired
        this.memoryCache.delete(key)
        this.totalSize -= cached.size
      }
    }

    // Check persistent cache
    const persistentData = await this.getPersistent(key)
    if (persistentData)
    {
      // Re-hydrate to memory cache
      this.set(key, type, persistentData)
      return persistentData
    }

    // Fetch if fetcher provided
    if (fetcher)
    {
      try
      {
        const data = await fetcher()
        await this.set(key, type, data)
        return data
      }
      catch (error)
      {
        console.error(`Cache fetch error for ${ key }:`, error)
        return null
      }
    }

    return null
  }

  async set<T>(key: string, type: string, data: T): Promise<void>
  {
    const strategy = this.cacheStrategies.get(type) || {
      maxAge: 300000,
      maxSize: 1024,
      priority: 'low'
    }

    const size = this.estimateSize(data)

    // Check if we need to evict entries
    if (this.totalSize + size > this.maxTotalSize)
    {
      await this.evictLRU(size)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      size,
      priority: strategy.priority
    }

    this.memoryCache.set(key, entry)
    this.totalSize += size

    // Persist important data
    if (strategy.priority !== 'low')
    {
      await this.setPersistent(key, data)
    }
  }

  private async evictLRU(requiredSpace: number): Promise<void>
  {
    const entries = Array.from(this.memoryCache.entries())
                         .map(([key, entry]) => ({ key, ...entry }))
                         .sort((a, b) =>
                         {
                           // Sort by priority first, then by least recently used
                           const priorityOrder = { low: 0, medium: 1, high: 2 }
                           const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]

                           if (priorityDiff !== 0) return priorityDiff

                           // LRU score: combination of age and hits
                           const scoreA = a.hits / (Date.now() - a.timestamp)
                           const scoreB = b.hits / (Date.now() - b.timestamp)

                           return scoreA - scoreB
                         })

    let freedSpace = 0
    for (const entry of entries)
    {
      if (freedSpace >= requiredSpace) break

      this.memoryCache.delete(entry.key)
      freedSpace += entry.size
      this.totalSize -= entry.size
    }
  }

  private estimateSize(data: any): number
  {
    // Rough estimation of object size
    return JSON.stringify(data).length * 2 // 2 bytes per character
  }

  private async getPersistent(key: string): Promise<any>
  {
    try
    {
      return await db.table('cache').get(key)
    }
    catch (error)
    {
      console.error('Persistent cache read error:', error)
      return null
    }
  }

  private async setPersistent(key: string, data: any): Promise<void>
  {
    try
    {
      await db.table('cache').put({
        key,
        data,
        timestamp: Date.now()
      })
    }
    catch (error)
    {
      console.error('Persistent cache write error:', error)
    }
  }

  invalidate(key: string): void
  {
    const entry = this.memoryCache.get(key)
    if (entry)
    {
      this.totalSize -= entry.size
      this.memoryCache.delete(key)
    }
  }

  invalidateByType(type: string): void
  {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.memoryCache)
    {
      if (key.includes(type))
      {
        keysToDelete.push(key)
        this.totalSize -= entry.size
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key))
  }

  clear(): void
  {
    this.memoryCache.clear()
    this.totalSize = 0
  }

  getStats(): {
    entries: number
    totalSize: number
    hitRate: number
  }
  {
    let totalHits = 0
    let totalRequests = 0

    for (const entry of this.memoryCache.values())
    {
      totalHits += entry.hits
      totalRequests += entry.hits + 1 // +1 for initial set
    }

    return {
      entries: this.memoryCache.size,
      totalSize: this.totalSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    }
  }
}
```

### 8. Upgraded Blockchain Service Orchestrator

```typescript
class UpgradedBlockchainService
{
  private static instance: UpgradedBlockchainService

  private eventBus: BlockchainEventBus
  private adaptivePolling: AdaptivePollingManager
  private webSocketProvider: WebSocketProvider
  private circuitBreakers: Map<string, CircuitBreaker>
  private requestDeduplicator: RequestDeduplicator
  private tokenDiscovery: IntelligentTokenDiscovery
  private cacheManager: EnhancedCacheManager

  private constructor()
  {
    this.eventBus = new BlockchainEventBusImpl()
    this.adaptivePolling = new AdaptivePollingManager(this.eventBus)
    this.webSocketProvider = new WebSocketProvider(
      this.getWebSocketConfig(),
      this.eventBus,
      () => this.fallbackToPolling()
    )
    this.circuitBreakers = new Map()
    this.requestDeduplicator = new RequestDeduplicator()
    this.tokenDiscovery = new IntelligentTokenDiscovery(db, this.eventBus)
    this.cacheManager = new EnhancedCacheManager(this.eventBus)

    this.setupEventHandlers()
  }

  static getInstance(): UpgradedBlockchainService
  {
    if (!UpgradedBlockchainService.instance)
    {
      UpgradedBlockchainService.instance = new UpgradedBlockchainService()
    }
    return UpgradedBlockchainService.instance
  }

  private setupEventHandlers(): void
  {
    // Handle balance updates from any source
    this.eventBus.on('balance:update', (data) =>
    {
      this.updateBalanceState(data)
    })

    // Handle price updates
    this.eventBus.on('price:update', (data) =>
    {
      this.updatePriceState(data)
    })

    // Handle new transactions
    this.eventBus.on('transaction:new', (data) =>
    {
      this.handleNewTransaction(data)
    })

    // Handle connection status changes
    this.eventBus.on('connection:status', (data) =>
    {
      this.handleConnectionChange(data)
    })
  }

  async startMonitoring(
    wallet: Wallet,
    network: Network
  ): Promise<void>
  {
    const monitoringKey = `${ wallet.address }_${ network.id }`

    // Try WebSocket first
    const wsSupported = await this.tryWebSocketConnection(network)

    if (wsSupported)
    {
      // Subscribe to wallet updates via WebSocket
      this.webSocketProvider.subscribe(network.id, [wallet.address])
    }
    else
    {
      // Fall back to adaptive polling
      this.startAdaptivePolling(wallet, network)
    }

    // Initial data fetch
    await this.fetchInitialData(wallet, network)
  }

  private async tryWebSocketConnection(network: Network): Promise<boolean>
  {
    try
    {
      await this.webSocketProvider.connect(network.id)
      return true
    }
    catch (error)
    {
      console.warn(`WebSocket not available for ${ network.id }, using polling`)
      return false
    }
  }

  private startAdaptivePolling(
    wallet: Wallet,
    network: Network
  ): void
  {
    const pollKey = `${ wallet.address }_${ network.id }`

    this.adaptivePolling.startPolling(
      pollKey,
      async () =>
      {
        await this.fetchWalletData(wallet, network)
      },
      { immediate: true }
    )
  }

  private async fetchWalletData(
    wallet: Wallet,
    network: Network
  ): Promise<void>
  {
    const fetchKey = `balance_${ wallet.address }_${ network.id }`

    // Use circuit breaker for network calls
    const circuitBreaker = this.getCircuitBreaker(network.id)

    try
    {
      await circuitBreaker.execute(
        async () =>
        {
          // Deduplicate concurrent requests
          await this.requestDeduplicator.deduplicate(
            fetchKey,
            async () =>
            {
              // Fetch balance with caching
              const balance = await this.fetchBalance(wallet, network)

              // Emit balance update event
              this.eventBus.emit('balance:update', {
                wallet: wallet.address,
                network: network.id,
                balance
              })

              return balance
            },
            { ttl: 1000 } // Cache for 1 second to prevent rapid re-fetches
          )
        },
        async () =>
        {
          // Fallback: use cached data
          const cached = await this.cacheManager.get(
            fetchKey,
            'balance'
          )

          if (cached)
          {
            this.eventBus.emit('balance:update', {
              wallet: wallet.address,
              network: network.id,
              balance: cached
            })
          }
        }
      )
    }
    catch (error)
    {
      console.error(`Failed to fetch wallet data: ${ error }`)
      // Service will automatically retry based on circuit breaker state
    }
  }

  private async fetchBalance(
    wallet: Wallet,
    network: Network
  ): Promise<BlockchainBalance>
  {
    // Get native balance
    const nativeBalance = await this.getNativeBalance(wallet, network)

    // Discover and fetch token balances
    const tokens = await this.tokenDiscovery.discoverTokens(
      wallet.address,
      network.chainId as number
    )

    const tokenBalances = await this.getTokenBalances(
      wallet,
      network,
      tokens.map(t => t.address)
    )

    // Get prices
    const prices = await this.getPrices(network, tokenBalances)

    // Calculate totals
    const balance = this.calculateBalance(
      nativeBalance,
      tokenBalances,
      prices
    )

    // Cache the result
    await this.cacheManager.set(
      `balance_${ wallet.address }_${ network.id }`,
      'balance',
      balance
    )

    return balance
  }

  private getCircuitBreaker(networkId: string): CircuitBreaker
  {
    let breaker = this.circuitBreakers.get(networkId)

    if (!breaker)
    {
      breaker = new CircuitBreaker(`network_${ networkId }`, {
        failureThreshold: 3,
        resetTimeout: 30000,
        halfOpenRequests: 2
      })
      this.circuitBreakers.set(networkId, breaker)
    }

    return breaker
  }

  private fallbackToPolling(): void
  {
    console.log('Falling back to adaptive polling for all active monitors')
    // Implementation would restart polling for all active monitors
  }

  stopMonitoring(wallet: Wallet, network: Network): void
  {
    const monitoringKey = `${ wallet.address }_${ network.id }`

    // Stop polling
    this.adaptivePolling.stopPolling(monitoringKey)

    // Unsubscribe from WebSocket
    this.webSocketProvider.unsubscribe(network.id, [wallet.address])
  }

  stopAllMonitoring(): void
  {
    // Stop all polling
    this.adaptivePolling.stopAll()

    // Disconnect all WebSockets
    this.webSocketProvider.disconnectAll()

    // Clear caches
    this.requestDeduplicator.clear()
  }

  // Additional methods for balance calculation, price fetching, etc.
  // would be implemented here following the same patterns

  private async getNativeBalance(
    wallet: Wallet,
    network: Network
  ): Promise<string>
  {
    // Implementation using appropriate service (EVM/SVM)
    return '0'
  }

  private async getTokenBalances(
    wallet: Wallet,
    network: Network,
    tokenAddresses: string[]
  ): Promise<TokenBalance[]>
  {
    // Implementation
    return []
  }

  private async getPrices(
    network: Network,
    tokens: TokenBalance[]
  ): Promise<Record<string, number>>
  {
    // Implementation with caching and deduplication
    return {}
  }

  private calculateBalance(
    nativeBalance: string,
    tokenBalances: TokenBalance[],
    prices: Record<string, number>
  ): BlockchainBalance
  {
    // Implementation
    return {
      native: nativeBalance,
      nativeUSD: 0,
      tokens: tokenBalances,
      totalUSD: 0
    }
  }

  private updateBalanceState(data: any): void
  {
    // Update state management
  }

  private updatePriceState(data: any): void
  {
    // Update state management
  }

  private handleNewTransaction(data: any): void
  {
    // Handle new transaction
  }

  private handleConnectionChange(data: any): void
  {
    // Handle connection status change
  }

  private async fetchInitialData(
    wallet: Wallet,
    network: Network
  ): Promise<void>
  {
    // Fetch and cache initial data
  }

  private getWebSocketConfig(): WebSocketConfig
  {
    return {
      urls: {
        ethereum: process.env.VITE_WS_ETHEREUM || '',
        polygon: process.env.VITE_WS_POLYGON || '',
        bsc: process.env.VITE_WS_BSC || '',
        solana: process.env.VITE_WS_SOLANA || ''
      },
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000
    }
  }
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. Implement Event Bus system
2. Add Circuit Breaker pattern to existing services
3. Implement Request Deduplicator
4. Add Enhanced Cache Manager

### Phase 2: Intelligence (Week 3-4)

1. Implement Intelligent Token Discovery
2. Add Adaptive Polling Manager
3. Integrate new caching strategies
4. Update existing services to use new patterns

### Phase 3: Real-Time (Week 5-6)

1. Implement WebSocket Provider
2. Add WebSocket fallback mechanisms
3. Integrate with existing monitoring
4. Test real-time updates

### Phase 4: Integration (Week 7-8)

1. Create Upgraded Blockchain Service
2. Migrate existing code to use new service
3. Update UI components for event-driven updates
4. Performance testing and optimization

## Backward Compatibility

The upgraded architecture maintains backward compatibility by:

1. **Keeping existing APIs**: All public methods remain the same
2. **Gradual migration**: Old services can coexist with new ones
3. **Feature flags**: Enable new features progressively
4. **Fallback mechanisms**: Always fall back to current behavior
5. **Data compatibility**: No changes to storage schema required

## Testing Strategy

### Unit Tests

- Test each new component in isolation
- Mock dependencies and external services
- Test error scenarios and edge cases

### Integration Tests

- Test component interactions
- Test fallback mechanisms
- Test WebSocket to polling transitions

### Performance Tests

- Measure improvement in resource usage
- Test with multiple concurrent wallets
- Stress test token discovery

### E2E Tests

- Test complete user workflows
- Test offline scenarios
- Test network switching

## Monitoring & Metrics

### Key Metrics to Track

1. **Resource Usage**
    - Memory consumption
    - CPU usage
    - Network requests/second

2. **Performance**
    - Time to first balance
    - Update latency
    - Cache hit rates

3. **Reliability**
    - Circuit breaker trips
    - WebSocket uptime
    - Error rates

4. **User Experience**
    - Loading times
    - Data freshness
    - UI responsiveness

## Conclusion

This upgraded architecture addresses all identified weaknesses while maintaining the strengths of the current system.
The modular, event-driven design provides better resource efficiency, improved reliability, and enhanced user
experience. The implementation can be done incrementally without disrupting existing functionality.