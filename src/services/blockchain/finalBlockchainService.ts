import { blockchainService as originalBlockchainService } from './blockchainService'
import type { BlockchainBalance } from './blockchainService'
import { 
  blockchainEventBus, 
  circuitBreakerFactory, 
  balanceRequestDeduplicator, 
  priceRequestDeduplicator 
} from './core'
import { adaptivePollingManager } from './polling/adaptivePollingManager'
import { enhancedCacheManager } from './cache/enhancedCacheManager'
import { tokenDiscoveryService } from './discovery/tokenDiscoveryService'
import { webSocketProvider } from './websocket/webSocketProvider'
import { Wallet, Network } from '../../types'
import { db } from '../storage/database'

export type { BlockchainBalance }

interface MonitoringSession {
  wallet: Wallet
  network: Network
  callback: (balance: BlockchainBalance) => void
  unsubscribe?: () => void
  useWebSocket: boolean
  lastUpdate: number
}

export class FinalBlockchainService {
  private static instance: FinalBlockchainService
  private monitoringSessions = new Map<string, MonitoringSession>()
  private lastDiscoveryTime = new Map<string, number>()
  private readonly DISCOVERY_INTERVAL = 5 * 60 * 1000 // 5 minutes

  private constructor(
    private eventBus = blockchainEventBus,
    private circuitFactory = circuitBreakerFactory,
    private balanceDeduplicator = balanceRequestDeduplicator,
    private priceDeduplicator = priceRequestDeduplicator,
    private pollingManager = adaptivePollingManager,
    private cacheManager = enhancedCacheManager,
    private tokenDiscovery = tokenDiscoveryService,
    private webSocket = webSocketProvider
  ) {
    this.setupEventHandlers()
    this.configureWebSocketUrls()
  }

  static getInstance(): FinalBlockchainService {
    if (!FinalBlockchainService.instance) {
      FinalBlockchainService.instance = new FinalBlockchainService()
    }
    return FinalBlockchainService.instance
  }

  /**
   * Configure WebSocket URLs from environment
   */
  private configureWebSocketUrls(): void {
    const urls: { [key: string]: string } = {}
    
    // Configure from environment variables
    if (process.env.VITE_WS_ETHEREUM) urls['ethereum'] = process.env.VITE_WS_ETHEREUM
    if (process.env.VITE_WS_POLYGON) urls['polygon'] = process.env.VITE_WS_POLYGON
    if (process.env.VITE_WS_BSC) urls['bsc'] = process.env.VITE_WS_BSC
    if (process.env.VITE_WS_ARBITRUM) urls['arbitrum'] = process.env.VITE_WS_ARBITRUM
    if (process.env.VITE_WS_OPTIMISM) urls['optimism'] = process.env.VITE_WS_OPTIMISM
    if (process.env.VITE_WS_SOLANA) urls['solana'] = process.env.VITE_WS_SOLANA
    
    this.webSocket.updateConfig(urls)
  }

  private setupEventHandlers(): void {
    // Handle balance updates from any source (WebSocket or polling)
    this.eventBus.on('balance:update', (data) => {
      const key = `${data.wallet}_${data.network}`
      const session = this.monitoringSessions.get(key)
      if (session) {
        session.lastUpdate = Date.now()
        session.callback(data.balance)
      }
    })

    // Handle connection status changes
    this.eventBus.on('connection:status', (data) => {
      console.log(`[FinalBlockchain] Connection ${data.status} for ${data.network || 'unknown'}`)
      
      // If WebSocket disconnected, ensure polling is active
      if (data.status === 'disconnected' && data.network) {
        this.handleWebSocketDisconnection(data.network)
      }
    })

    // Handle manual token changes
    this.eventBus.on('token:manual:added', async (data) => {
      const cacheKey = `balance_${data.wallet}_${data.chainId}`
      this.cacheManager.invalidate(cacheKey)
      
      // Trigger immediate refresh for affected wallet
      for (const [key, session] of this.monitoringSessions) {
        if (session.wallet.address === data.wallet) {
          await this.fetchBalance(session.wallet, session.network)
        }
      }
    })
  }

  /**
   * Start monitoring with WebSocket support and fallback to polling
   */
  async startPolling(
    wallet: Wallet,
    network: Network,
    onUpdate: (balance: BlockchainBalance) => void
  ): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    
    // Check if WebSocket is supported and try to connect
    const useWebSocket = await this.tryWebSocketConnection(wallet, network)
    
    // Create monitoring session
    const session: MonitoringSession = {
      wallet,
      network,
      callback: onUpdate,
      useWebSocket,
      lastUpdate: Date.now()
    }

    // Set up event listener
    const unsubscribe = this.eventBus.on('balance:update', (data) => {
      if (data.wallet === wallet.address && data.network === network.id) {
        onUpdate(data.balance)
      }
    })
    session.unsubscribe = unsubscribe

    this.monitoringSessions.set(key, session)

    if (useWebSocket) {
      console.log(`[FinalBlockchain] Using WebSocket for ${key}`)
      // Subscribe to WebSocket updates
      this.webSocket.subscribe(network.id, [wallet.address])
      
      // Also set up fallback polling at a slower rate
      this.pollingManager.startPolling(
        `${key}_fallback`,
        async () => {
          // Only poll if we haven't received updates recently
          const timeSinceUpdate = Date.now() - session.lastUpdate
          if (timeSinceUpdate > 60000) { // 1 minute
            console.log(`[FinalBlockchain] Fallback polling triggered for ${key}`)
            await this.fetchBalance(wallet, network)
          }
        },
        { immediate: false }
      )
    } else {
      console.log(`[FinalBlockchain] Using adaptive polling for ${key}`)
      // Use adaptive polling as primary method
      this.pollingManager.startPolling(
        key,
        async () => {
          await this.fetchBalance(wallet, network)
        },
        { immediate: true }
      )
    }

    // Initial fetch
    await this.fetchBalance(wallet, network)
  }

  /**
   * Try to establish WebSocket connection
   */
  private async tryWebSocketConnection(wallet: Wallet, network: Network): Promise<boolean> {
    if (!this.webSocket.isSupported(network.id)) {
      return false
    }

    try {
      const connected = await this.webSocket.connect(network.id)
      return connected
    } catch (error) {
      console.warn(`[FinalBlockchain] WebSocket connection failed for ${network.id}:`, error)
      return false
    }
  }

  /**
   * Handle WebSocket disconnection by ensuring polling is active
   */
  private handleWebSocketDisconnection(networkId: string): void {
    for (const [key, session] of this.monitoringSessions) {
      if (session.network.id === networkId && session.useWebSocket) {
        console.log(`[FinalBlockchain] WebSocket disconnected, activating polling for ${key}`)
        
        // Start or restart polling
        this.pollingManager.startPolling(
          key,
          async () => {
            await this.fetchBalance(session.wallet, session.network)
          },
          { immediate: false }
        )
      }
    }
  }

  /**
   * Enhanced balance fetching with all features
   */
  private async fetchBalance(wallet: Wallet, network: Network): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    const cacheKey = `balance_${key}`
    
    // Check if we should run token discovery
    const shouldDiscover = this.shouldRunTokenDiscovery(key)
    
    // Get circuit breaker
    const circuitBreaker = this.circuitFactory.getBreaker(`network_${network.id}`, {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenRequests: 2,
      timeout: 15000
    })

    try {
      await circuitBreaker.execute(
        async () => {
          // Run token discovery if needed
          if (shouldDiscover) {
            await this.runTokenDiscovery(wallet, network)
          }

          // Get balance with cache
          const balance = await this.cacheManager.get<BlockchainBalance>(
            cacheKey,
            'balance',
            async () => {
              return await this.balanceDeduplicator.deduplicate(
                cacheKey,
                async () => {
                  console.debug(`[FinalBlockchain] Fetching balance for ${key}`)
                  return await this.getEnhancedBalance(wallet, network)
                },
                { ttl: 2000 }
              )
            }
          )

          if (balance) {
            this.eventBus.emit('balance:update', {
              wallet: wallet.address,
              network: network.id,
              balance
            })
          }
        },
        async () => {
          // Fallback: use cached data
          console.warn(`[FinalBlockchain] Circuit breaker open for ${network.id}`)
          const cachedBalance = await this.cacheManager.get<BlockchainBalance>(
            cacheKey,
            'balance'
          )
          
          if (cachedBalance) {
            this.eventBus.emit('balance:update', {
              wallet: wallet.address,
              network: network.id,
              balance: cachedBalance
            })
          }
        }
      )
    } catch (error) {
      console.error(`[FinalBlockchain] Failed to fetch balance:`, error)
      this.eventBus.emit('error', {
        source: 'final_blockchain_service',
        error: error as Error
      })
    }
  }

  /**
   * Stop monitoring
   */
  stopPolling(wallet: Wallet, network: Network): void {
    const key = `${wallet.address}_${network.id}`
    const session = this.monitoringSessions.get(key)
    
    if (session) {
      // Unsubscribe from events
      if (session.unsubscribe) {
        session.unsubscribe()
      }
      
      // Stop WebSocket subscription
      if (session.useWebSocket) {
        this.webSocket.unsubscribe(network.id, [wallet.address])
        this.pollingManager.stopPolling(`${key}_fallback`)
      }
      
      // Stop polling
      this.pollingManager.stopPolling(key)
      
      // Clean up
      this.monitoringSessions.delete(key)
      this.lastDiscoveryTime.delete(key)
    }
  }

  /**
   * Stop all monitoring
   */
  stopAllPolling(): void {
    for (const [key, session] of this.monitoringSessions) {
      this.stopPolling(session.wallet, session.network)
    }
    this.monitoringSessions.clear()
    this.lastDiscoveryTime.clear()
  }

  /**
   * Check if token discovery should run
   */
  private shouldRunTokenDiscovery(key: string): boolean {
    const lastDiscovery = this.lastDiscoveryTime.get(key) || 0
    return Date.now() - lastDiscovery > this.DISCOVERY_INTERVAL
  }

  /**
   * Run token discovery
   */
  private async runTokenDiscovery(wallet: Wallet, network: Network): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    
    try {
      const discoveredTokens = await this.tokenDiscovery.discoverTokens(
        wallet.address,
        network.chainId as number,
        network,
        {
          includeZeroBalance: false,
          strategies: ['manual', 'historical', 'alchemy', 'popular']
        }
      )
      
      this.lastDiscoveryTime.set(key, Date.now())
      
      const tokenAddresses = discoveredTokens.map(t => t.address)
      await this.cacheDiscoveredTokens(wallet.address, network.id, tokenAddresses)
      
    } catch (error) {
      console.error(`[FinalBlockchain] Token discovery failed:`, error)
    }
  }

  /**
   * Get enhanced balance with discovered tokens
   */
  private async getEnhancedBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    const tokenAddresses = await this.getDiscoveredTokenAddresses(
      wallet.address, 
      network.chainId as number
    )
    
    // Create temporary service with custom token list
    const tempService = Object.create(originalBlockchainService)
    tempService.getTokenAddressesToCheck = async () => tokenAddresses
    
    return await tempService.getBalance(wallet, network)
  }

  /**
   * Get discovered token addresses
   */
  private async getDiscoveredTokenAddresses(
    walletAddress: string,
    chainId: number
  ): Promise<string[]> {
    const manualTokens = await db.discoveredTokens
      .where('walletAddress').equals(walletAddress)
      .and(token => token.chainId === chainId.toString())
      .and(token => token.addedManually === true)
      .toArray()

    const discoveredTokens = await db.discoveredTokens
      .where('walletAddress').equals(walletAddress)
      .and(token => token.chainId === chainId.toString())
      .and(token => token.addedManually !== true)
      .sortBy('lastSeen')

    const allTokens = [...manualTokens, ...discoveredTokens.reverse()]
    const uniqueAddresses = new Set<string>()
    const addresses: string[] = []

    for (const token of allTokens) {
      const address = token.tokenAddress.toLowerCase()
      if (!uniqueAddresses.has(address)) {
        uniqueAddresses.add(address)
        addresses.push(address)
      }
    }

    return addresses.slice(0, 100)
  }

  /**
   * Cache discovered tokens
   */
  private async cacheDiscoveredTokens(
    walletAddress: string,
    networkId: string,
    tokenAddresses: string[]
  ): Promise<void> {
    const cacheKey = `discovered_tokens_${walletAddress}_${networkId}`
    await this.cacheManager.set(cacheKey, 'metadata', tokenAddresses)
  }

  /**
   * Get balance on-demand
   */
  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    const key = `${wallet.address}_${network.id}`
    
    if (this.shouldRunTokenDiscovery(key)) {
      await this.runTokenDiscovery(wallet, network)
    }
    
    return this.getEnhancedBalance(wallet, network)
  }

  /**
   * Token management methods
   */
  async addToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    tokenInfo: { symbol?: string; name?: string; decimals?: number }
  ): Promise<void> {
    await this.tokenDiscovery.addManualToken(
      wallet.address,
      network.chainId as number,
      tokenAddress,
      tokenInfo
    )
  }

  async removeToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string
  ): Promise<void> {
    await this.tokenDiscovery.removeManualToken(
      wallet.address,
      network.chainId as number,
      tokenAddress
    )
  }

  async getTokenDiscoveryStats(wallet: Wallet, network: Network) {
    return this.tokenDiscovery.getDiscoveryStats(
      wallet.address,
      network.chainId as number
    )
  }

  /**
   * Delegate transaction methods
   */
  validateAddress(address: string, type: 'EVM' | 'SVM'): boolean {
    return originalBlockchainService.validateAddress(address, type)
  }

  async sendTransaction(
    wallet: Wallet,
    network: Network,
    to: string,
    amount: string,
    password: string
  ): Promise<string> {
    const hash = await originalBlockchainService.sendTransaction(
      wallet, network, to, amount, password
    )

    this.eventBus.emit('transaction:new', {
      transaction: {
        hash, from: wallet.address, to, amount,
        network: network.id, timestamp: new Date()
      }
    })

    const cacheKey = `balance_${wallet.address}_${network.id}`
    this.cacheManager.invalidate(cacheKey)

    return hash
  }

  async sendToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
    password: string,
    tokenSymbol?: string
  ): Promise<string> {
    const hash = await originalBlockchainService.sendToken(
      wallet, network, tokenAddress, to, amount, decimals, password, tokenSymbol
    )

    this.eventBus.emit('transaction:new', {
      transaction: {
        hash, from: wallet.address, to, amount,
        tokenAddress, tokenSymbol, network: network.id,
        timestamp: new Date()
      }
    })

    const cacheKey = `balance_${wallet.address}_${network.id}`
    this.cacheManager.invalidate(cacheKey)

    return hash
  }

  async estimateTransactionFee(
    wallet: Wallet,
    network: Network,
    to: string,
    amount?: string
  ): Promise<string> {
    return originalBlockchainService.estimateTransactionFee(wallet, network, to, amount)
  }

  async getTransactionHistory(wallet: Wallet, network: Network) {
    return originalBlockchainService.getTransactionHistory(wallet, network)
  }

  /**
   * Get comprehensive stats
   */
  getStats() {
    const wsStatus = this.webSocket.getConnectionStatus()
    const sessions = Array.from(this.monitoringSessions.entries()).map(([key, session]) => ({
      key,
      wallet: session.wallet.address,
      network: session.network.id,
      useWebSocket: session.useWebSocket,
      lastUpdate: new Date(session.lastUpdate).toISOString()
    }))

    return {
      monitoring: {
        activeSessions: this.monitoringSessions.size,
        sessions,
        lastDiscovery: Object.fromEntries(this.lastDiscoveryTime)
      },
      webSocket: {
        connections: Object.fromEntries(wsStatus),
        supported: Object.keys(this.webSocket['config'].urls || {})
      },
      polling: this.pollingManager.getPollingStats(),
      cache: this.cacheManager.getStats(),
      circuitBreakers: this.circuitFactory.getStats(),
      deduplicator: {
        balance: this.balanceDeduplicator.getStats(),
        price: this.priceDeduplicator.getStats()
      },
      eventBus: {
        listeners: {
          'balance:update': this.eventBus.getListenerCount('balance:update'),
          'price:update': this.eventBus.getListenerCount('price:update'),
          'transaction:new': this.eventBus.getListenerCount('transaction:new'),
          'connection:status': this.eventBus.getListenerCount('connection:status')
        }
      }
    }
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.stopAllPolling()
    this.webSocket.destroy()
    this.pollingManager.destroy()
    this.cacheManager.destroy()
    this.circuitFactory.destroyAll()
    this.balanceDeduplicator.destroy()
    this.priceDeduplicator.destroy()
  }
}

// Create singleton instance
export const finalBlockchainService = FinalBlockchainService.getInstance()

// Export as blockchainService for backward compatibility
export { finalBlockchainService as blockchainService }