import { blockchainService as originalBlockchainService } from './blockchainService'
import type { BlockchainBalance } from './blockchainService'
import { blockchainEventBus, circuitBreakerFactory, balanceRequestDeduplicator, priceRequestDeduplicator } from './core'
import { adaptivePollingManager } from './polling/adaptivePollingManager'
import { enhancedCacheManager } from './cache/enhancedCacheManager'
import { tokenDiscoveryService } from './discovery/tokenDiscoveryService'
import { Wallet, Network, TokenBalance } from '../../types'
import { db } from '../storage/database'

export type { BlockchainBalance }

export class EnhancedBlockchainServiceV2 {
  private static instance: EnhancedBlockchainServiceV2
  private monitoringKeys = new Set<string>()
  private lastDiscoveryTime = new Map<string, number>()
  private DISCOVERY_INTERVAL = 5 * 60 * 1000 // 5 minutes between discoveries

  private constructor(
    private eventBus = blockchainEventBus,
    private circuitFactory = circuitBreakerFactory,
    private balanceDeduplicator = balanceRequestDeduplicator,
    private priceDeduplicator = priceRequestDeduplicator,
    private pollingManager = adaptivePollingManager,
    private cacheManager = enhancedCacheManager,
    private tokenDiscovery = tokenDiscoveryService
  ) {
    this.setupEventHandlers()
  }

  static getInstance(): EnhancedBlockchainServiceV2 {
    if (!EnhancedBlockchainServiceV2.instance) {
      EnhancedBlockchainServiceV2.instance = new EnhancedBlockchainServiceV2()
    }
    return EnhancedBlockchainServiceV2.instance
  }

  private setupEventHandlers(): void {
    // Handle manual token additions
    this.eventBus.on('token:manual:added', async (data) => {
      const cacheKey = `balance_${data.wallet}_${data.chainId}`
      this.cacheManager.invalidate(cacheKey)
      
      // Trigger immediate balance refresh
      const wallet = await this.findWallet(data.wallet)
      const network = await this.findNetwork(data.chainId)
      if (wallet && network) {
        await this.fetchBalance(wallet, network)
      }
    })

    // Handle token discovery completion
    this.eventBus.on('token:discovery:complete', (data) => {
      console.log(`[EnhancedBlockchainV2] Token discovery completed: ${data.count} tokens for ${data.wallet}`)
    })
  }

  /**
   * Start monitoring with intelligent token discovery
   */
  async startPolling(
    wallet: Wallet,
    network: Network,
    onUpdate: (balance: BlockchainBalance) => void
  ): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    this.monitoringKeys.add(key)

    // Set up balance update listener
    const unsubscribe = this.eventBus.on('balance:update', (data) => {
      if (data.wallet === wallet.address && data.network === network.id) {
        onUpdate(data.balance)
      }
    })

    // Start adaptive polling with enhanced balance fetching
    this.pollingManager.startPolling(
      key,
      async () => {
        await this.fetchEnhancedBalance(wallet, network)
      },
      { immediate: true }
    )

    // Store unsubscribe function for cleanup
    (wallet as any).__unsubscribe = unsubscribe
  }

  /**
   * Enhanced balance fetching with intelligent token discovery
   */
  private async fetchEnhancedBalance(wallet: Wallet, network: Network): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    const cacheKey = `balance_${key}`
    
    // Check if we should run token discovery
    const shouldDiscover = this.shouldRunTokenDiscovery(key)
    
    // Get circuit breaker for this network
    const circuitBreaker = this.circuitFactory.getBreaker(`network_${network.id}`, {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenRequests: 2,
      timeout: 15000 // 15 second timeout
    })

    try {
      await circuitBreaker.execute(
        async () => {
          // Run token discovery if needed
          if (shouldDiscover) {
            await this.runTokenDiscovery(wallet, network)
          }

          // Get balance with enhanced token list
          const balance = await this.cacheManager.get<BlockchainBalance>(
            cacheKey,
            'balance',
            async () => {
              return await this.balanceDeduplicator.deduplicate(
                cacheKey,
                async () => {
                  console.debug(`[EnhancedBlockchainV2] Fetching balance with discovered tokens for ${key}`)
                  return await this.getEnhancedBalance(wallet, network)
                },
                { ttl: 2000 }
              )
            }
          )

          if (balance) {
            // Emit balance update event
            this.eventBus.emit('balance:update', {
              wallet: wallet.address,
              network: network.id,
              balance
            })
          }
        },
        async () => {
          // Fallback: use cached data
          console.warn(`[EnhancedBlockchainV2] Circuit breaker open for ${network.id}, using cached data`)
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
      console.error(`[EnhancedBlockchainV2] Failed to fetch balance for ${key}:`, error)
      this.eventBus.emit('error', {
        source: 'enhanced_blockchain_v2',
        error: error as Error
      })
    }
  }

  /**
   * Check if token discovery should run
   */
  private shouldRunTokenDiscovery(key: string): boolean {
    const lastDiscovery = this.lastDiscoveryTime.get(key) || 0
    const timeSinceDiscovery = Date.now() - lastDiscovery
    return timeSinceDiscovery > this.DISCOVERY_INTERVAL
  }

  /**
   * Run intelligent token discovery
   */
  private async runTokenDiscovery(wallet: Wallet, network: Network): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    
    try {
      console.log(`[EnhancedBlockchainV2] Running token discovery for ${key}`)
      
      const discoveredTokens = await this.tokenDiscovery.discoverTokens(
        wallet.address,
        network.chainId as number,
        network,
        {
          includeZeroBalance: false,
          strategies: ['manual', 'historical', 'alchemy', 'popular']
        }
      )

      console.log(`[EnhancedBlockchainV2] Discovered ${discoveredTokens.length} tokens`)
      
      // Update last discovery time
      this.lastDiscoveryTime.set(key, Date.now())
      
      // Cache discovered tokens for balance fetching
      const tokenAddresses = discoveredTokens.map(t => t.address)
      await this.cacheDiscoveredTokens(wallet.address, network.id, tokenAddresses)
      
    } catch (error) {
      console.error(`[EnhancedBlockchainV2] Token discovery failed:`, error)
    }
  }

  /**
   * Get enhanced balance with discovered tokens
   */
  private async getEnhancedBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    // Get discovered token addresses
    const tokenAddresses = await this.getDiscoveredTokenAddresses(wallet.address, network.chainId as number)
    
    console.log(`[EnhancedBlockchainV2] Fetching balance for ${tokenAddresses.length} discovered tokens`)
    
    // Create a temporary blockchain service instance with custom token list
    const tempService = Object.create(originalBlockchainService)
    
    // Override the getTokenAddressesToCheck method
    tempService.getTokenAddressesToCheck = async () => tokenAddresses
    
    // Use the temporary service to get balance with our discovered tokens
    return await tempService.getBalance(wallet, network)
  }

  /**
   * Get discovered token addresses from cache/db
   */
  private async getDiscoveredTokenAddresses(
    walletAddress: string,
    chainId: number
  ): Promise<string[]> {
    // Get manually added tokens (highest priority)
    const manualTokens = await db.discoveredTokens
      .where('walletAddress').equals(walletAddress)
      .and(token => token.chainId === chainId.toString())
      .and(token => token.addedManually === true)
      .toArray()

    // Get other discovered tokens
    const discoveredTokens = await db.discoveredTokens
      .where('walletAddress').equals(walletAddress)
      .and(token => token.chainId === chainId.toString())
      .and(token => token.addedManually !== true)
      .sortBy('lastSeen')

    // Combine and deduplicate
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

    // Limit to max tokens
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
   * Stop polling
   */
  stopPolling(wallet: Wallet, network: Network): void {
    const key = `${wallet.address}_${network.id}`
    this.monitoringKeys.delete(key)
    this.lastDiscoveryTime.delete(key)
    
    // Stop adaptive polling
    this.pollingManager.stopPolling(key)
    
    // Clean up event listener
    const unsubscribe = (wallet as any).__unsubscribe
    if (unsubscribe) {
      unsubscribe()
      delete (wallet as any).__unsubscribe
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollingManager.stopAll()
    this.monitoringKeys.clear()
    this.lastDiscoveryTime.clear()
  }

  /**
   * Get balance on-demand with token discovery
   */
  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    const key = `${wallet.address}_${network.id}`
    
    // Run discovery if needed
    if (this.shouldRunTokenDiscovery(key)) {
      await this.runTokenDiscovery(wallet, network)
    }
    
    // Get enhanced balance
    return this.getEnhancedBalance(wallet, network)
  }

  /**
   * Manually add a token
   */
  async addToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    tokenInfo: {
      symbol?: string
      name?: string
      decimals?: number
    }
  ): Promise<void> {
    await this.tokenDiscovery.addManualToken(
      wallet.address,
      network.chainId as number,
      tokenAddress,
      tokenInfo
    )
  }

  /**
   * Remove a manually added token
   */
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

  /**
   * Get token discovery stats
   */
  async getTokenDiscoveryStats(wallet: Wallet, network: Network) {
    return this.tokenDiscovery.getDiscoveryStats(
      wallet.address,
      network.chainId as number
    )
  }

  /**
   * Helper methods
   */
  private async findWallet(address: string): Promise<Wallet | null> {
    const wallets = await db.wallets.toArray()
    return wallets.find(w => w.address.toLowerCase() === address.toLowerCase()) || null
  }

  private async findNetwork(chainId: number): Promise<Network | null> {
    // This would need to be implemented based on your network configuration
    return null
  }

  /**
   * Delegate other methods to upgraded service
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
      wallet,
      network,
      to,
      amount,
      password
    )

    // Emit transaction event
    this.eventBus.emit('transaction:new', {
      transaction: {
        hash,
        from: wallet.address,
        to,
        amount,
        network: network.id,
        timestamp: new Date()
      }
    })

    // Invalidate cache
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
      wallet,
      network,
      tokenAddress,
      to,
      amount,
      decimals,
      password,
      tokenSymbol
    )

    // Emit transaction event
    this.eventBus.emit('transaction:new', {
      transaction: {
        hash,
        from: wallet.address,
        to,
        amount,
        tokenAddress,
        tokenSymbol,
        network: network.id,
        timestamp: new Date()
      }
    })

    // Invalidate cache
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
    const pollingStats = this.pollingManager.getPollingStats()
    const cacheStats = this.cacheManager.getStats()
    const circuitStats = this.circuitFactory.getStats()
    
    return {
      monitoring: {
        activeWallets: this.monitoringKeys.size,
        wallets: Array.from(this.monitoringKeys),
        lastDiscovery: Object.fromEntries(this.lastDiscoveryTime)
      },
      polling: pollingStats,
      cache: cacheStats,
      circuitBreakers: circuitStats,
      deduplicator: {
        balance: this.balanceDeduplicator.getStats(),
        price: this.priceDeduplicator.getStats()
      },
      eventBus: {
        listeners: {
          'balance:update': this.eventBus.getListenerCount('balance:update'),
          'transaction:new': this.eventBus.getListenerCount('transaction:new'),
          'token:discovery:complete': this.eventBus.getListenerCount('token:discovery:complete')
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAllPolling()
    this.pollingManager.destroy()
    this.cacheManager.destroy()
    this.circuitFactory.destroyAll()
    this.balanceDeduplicator.destroy()
    this.priceDeduplicator.destroy()
  }
}

// Create singleton instance
export const enhancedBlockchainServiceV2 = EnhancedBlockchainServiceV2.getInstance()

// For backward compatibility
export { enhancedBlockchainServiceV2 as blockchainService }