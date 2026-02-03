# Blockchain Data Architecture Overview

## Executive Summary

OpenWallet implements a multi-layered blockchain data architecture that fetches, processes, caches, and displays
blockchain data across multiple networks (EVM and Solana). The system uses a polling-based approach with IndexedDB
caching for performance optimization and offline capabilities.

## Data Flow Architecture

```
User Interface (React Components)
        ↓
    Hooks Layer (useWalletBalance, useTransactionHistory)
        ↓
    Service Layer (BlockchainService)
        ↓
    Network Services (EVMService, SVMService, AlchemyService)
        ↓
    External APIs (RPC Nodes, CoinGecko, Alchemy SDK)
        ↓
    Caching Layer (IndexedDB via Dexie)
```

## Core Components

### 1. BlockchainService (Orchestrator)

- **Location**: `/src/services/blockchain/blockchainService.ts`
- **Purpose**: Central orchestrator for all blockchain data operations
- **Key Features**:
    - Polling mechanism (5-second intervals)
    - Balance aggregation (native + tokens)
    - Price fetching coordination
    - Cache management
    - Transaction monitoring

### 2. Network-Specific Services

#### EVMService

- **Location**: `/src/services/blockchain/evmService.ts`
- **Purpose**: Handles Ethereum Virtual Machine compatible chains
- **Features**:
    - ERC20 token balance fetching
    - Alchemy SDK integration for optimized queries
    - Fallback to standard RPC calls
    - Token metadata caching

#### SVMService

- **Location**: `/src/services/blockchain/svmService.ts`
- **Purpose**: Handles Solana Virtual Machine operations
- **Features**:
    - SPL token balance fetching
    - Solana-specific RPC interactions

### 3. State Management

- **Store**: Zustand (`/src/store/walletStore.ts`)
- **Persistence**: Selected state persisted to localStorage
- **Key State**:
    - Active wallet and network
    - Wallet groups and individual wallets
    - Network preferences per chain type

### 4. Caching System

#### IndexedDB Tables (via Dexie)

1. **walletBalances**: Native token balances and total USD values
2. **tokenBalances**: Individual token balances per wallet/network
3. **priceData**: Current token prices from CoinGecko
4. **tokenMetadata**: Token information (name, symbol, decimals, logo)
5. **discoveredTokens**: Manually added tokens by users
6. **transactions**: Transaction history

#### Cache Strategy

- **Price Data**: 5-minute refresh interval
- **Balance Data**: Continuous 5-second polling
- **Token Metadata**: Cached indefinitely
- **Images**: Fetched asynchronously and cached

## Data Fetching Flow

### 1. Balance Fetching Process

```
1. useWalletBalance hook initiates request
2. Load cached data immediately (if available)
3. BlockchainService starts polling
4. For each poll:
   a. Fetch native balance via RPC
   b. Get token list from cache/discovered tokens
   c. Batch fetch token balances
   d. Fetch/use cached prices
   e. Calculate USD values
   f. Update cache
   g. Notify UI via callback
```

### 2. Token Discovery

```
1. Check manually added tokens (highest priority)
2. Check previously seen tokens with balance > 0
3. Use Alchemy SDK for automatic discovery (if available)
4. Limit to 50 tokens per wallet to prevent overload
```

### 3. Price Fetching

```
1. Check if 5 minutes passed since last fetch
2. Use active price fetch if already in progress
3. Fetch from CoinGecko API
4. Cache results in IndexedDB
5. Fallback to cached prices on error
```

## Current Structure Pros

### 1. Performance Optimization

- **Immediate UI Response**: Cached data shown instantly while fresh data loads
- **Reduced API Calls**: 5-minute price caching reduces CoinGecko rate limit issues
- **Batch Processing**: Token balances fetched in batches of 10
- **Shared Price Fetches**: Multiple components share same price fetch promise

### 2. Reliability

- **Multiple Fallbacks**: Alchemy → Standard RPC → Cached data
- **Error Recovery**: Retry logic for intermittent failures
- **Offline Support**: Full functionality with cached data

### 3. User Experience

- **No Loading Screens**: Cached data prevents blank states
- **Background Updates**: Polling updates data without interrupting user
- **Progressive Enhancement**: Basic data shown first, enriched over time

### 4. Scalability

- **Service Caching**: Token service instances reused per network
- **Selective Polling**: Only active wallet/network polled
- **Token Limits**: Maximum 50 tokens per wallet prevents overload

## Current Structure Cons

### 1. Resource Usage

- **Continuous Polling**: 5-second interval may be excessive for inactive users
- **Memory Usage**: Multiple service instances and caches in memory
- **Database Growth**: IndexedDB can grow large with many wallets/tokens

### 2. Complexity

- **Multiple Layers**: Data flows through many layers before reaching UI
- **Cache Synchronization**: Multiple cache locations need coordination
- **Error Handling**: Complex error scenarios across different services

### 3. Data Consistency

- **Stale Data Risk**: Cached prices may be outdated during volatility
- **Race Conditions**: Multiple simultaneous fetches can cause conflicts
- **Network Switching**: Potential mismatches between wallet and network types

### 4. Limited Flexibility

- **Fixed Intervals**: No adaptive polling based on user activity
- **Hard Limits**: 50 token limit may miss important tokens
- **No WebSocket**: Real-time updates not supported

## Improvement Suggestions

### 1. Enhanced Performance

#### Adaptive Polling

```typescript
// Implement activity-based polling intervals
interface PollingConfig
{
  active: 5000,      // 5 seconds when active
  inactive: 30000,   // 30 seconds when inactive
  background: 60000  // 1 minute when tab hidden
}

// Detect user activity and adjust polling
const adjustPollingInterval = (lastActivity: number) =>
{
  const timeSinceActivity = Date.now() - lastActivity
  if (timeSinceActivity < 60000) return PollingConfig.active
  if (document.hidden) return PollingConfig.background
  return PollingConfig.inactive
}
```

#### WebSocket Integration

```typescript
// Add WebSocket support for real-time updates
class WebSocketService
{
  subscribe(address: string, callback: (data: any) => void)
  {
    // Subscribe to address-specific events
  }

  unsubscribe(address: string)
  {
    // Clean up subscriptions
  }
}
```

### 2. Improved Reliability

#### Circuit Breaker Pattern

```typescript
class CircuitBreaker
{
  private failures = 0
  private lastFailure = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  async execute<T>(fn: () => Promise<T>): Promise<T>
  {
    if (this.state === 'open' && Date.now() - this.lastFailure < 60000)
    {
      throw new Error('Circuit breaker is open')
    }

    try
    {
      const result = await fn()
      this.reset()
      return result
    }
    catch (error)
    {
      this.recordFailure()
      throw error
    }
  }
}
```

#### Request Deduplication

```typescript
class RequestDeduplicator
{
  private pending = new Map<string, Promise<any>>()

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T>
  {
    const existing = this.pending.get(key)
    if (existing) return existing

    const promise = fn().finally(() =>
    {
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }
}
```

### 3. Enhanced Data Management

#### Intelligent Token Discovery

```typescript
interface TokenDiscoveryStrategy
{
  // Prioritize tokens by various factors
  prioritizeTokens(tokens: Token[]): Token[]

{
  return tokens.sort((a, b) =>
  {
    // Sort by: manual > high balance > recent activity > alphabetical
    if (a.addedManually !== b.addedManually)
    {
      return a.addedManually ? -1 : 1
    }
    if (a.lastActivity !== b.lastActivity)
    {
      return b.lastActivity - a.lastActivity
    }
    return parseFloat(b.balance) - parseFloat(a.balance)
  })
}
}
```

#### Cache Invalidation Strategy

```typescript
interface CacheInvalidation
{
  // Smart cache invalidation based on data age and importance
  shouldInvalidate(data: CachedData): boolean

{
  const age = Date.now() - data.lastUpdated
  const priority = this.calculatePriority(data)

  // High priority data refreshed more frequently
  if (priority === 'high' && age > 60000) return true
  if (priority === 'medium' && age > 300000) return true
  if (priority === 'low' && age > 900000) return true

  return false
}
}
```

### 4. Better Error Handling

#### Graceful Degradation

```typescript
class GracefulService
{
  async getBalance(wallet: Wallet, network: Network): Promise<Balance>
  {
    try
    {
      // Try primary method
      return await this.getPrimaryBalance(wallet, network)
    }
    catch (primaryError)
    {
      console.warn('Primary balance fetch failed:', primaryError)

      try
      {
        // Try secondary method
        return await this.getSecondaryBalance(wallet, network)
      }
      catch (secondaryError)
      {
        console.warn('Secondary balance fetch failed:', secondaryError)

        // Return cached or estimated data
        return await this.getCachedBalance(wallet, network)
      }
    }
  }
}
```

### 5. Architecture Improvements

#### Event-Driven Updates

```typescript
// Replace polling with event-driven architecture
class BlockchainEventBus
{
  private events = new EventTarget()

  emit(event: string, data: any)
  {
    this.events.dispatchEvent(new CustomEvent(event, { detail: data }))
  }

  on(event: string, handler: (data: any) => void)
  {
    this.events.addEventListener(event, (e: any) => handler(e.detail))
  }
}

// Usage
eventBus.on('balance:update', (data) =>
{
  updateUIBalance(data)
})
```

#### Modular Service Architecture

```typescript
// More modular service design
interface IBalanceProvider
{
  getBalance(address: string): Promise<string>
}

interface IPriceProvider
{
  getPrice(symbol: string): Promise<number>
}

interface ITokenProvider
{
  getTokens(address: string): Promise<Token[]>
}

// Compose services
class CompositeBlockchainService
{
  constructor(
    private balanceProvider: IBalanceProvider,
    private priceProvider: IPriceProvider,
    private tokenProvider: ITokenProvider
  )
  {
  }
}
```

## Conclusion

The current blockchain data architecture provides a solid foundation with good performance and reliability. The main
areas for improvement are:

1. **Resource Efficiency**: Implement adaptive polling and WebSocket support
2. **Error Resilience**: Add circuit breakers and better fallback mechanisms
3. **Data Quality**: Improve token discovery and cache invalidation
4. **Architecture**: Move towards event-driven, modular design

These improvements would enhance user experience while reducing resource usage and improving maintainability.