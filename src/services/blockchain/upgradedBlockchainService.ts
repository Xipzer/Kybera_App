import { blockchainService as originalBlockchainService } from './blockchainService'
import type { BlockchainBalance } from './blockchainService'
import { blockchainEventBus, circuitBreakerFactory, balanceRequestDeduplicator } from './core'
import { adaptivePollingManager } from './polling/adaptivePollingManager'
import { enhancedCacheManager } from './cache/enhancedCacheManager'
import { Wallet, Network } from '../../types'

export type { BlockchainBalance }

export class UpgradedBlockchainService {
  private static instance: UpgradedBlockchainService
  private monitoringKeys = new Set<string>()

  private constructor(
    private eventBus = blockchainEventBus,
    private circuitFactory = circuitBreakerFactory,
    private deduplicator = balanceRequestDeduplicator,
    private pollingManager = adaptivePollingManager,
    private cacheManager = enhancedCacheManager
  ) {
    this.setupEventHandlers()
  }

  static getInstance(): UpgradedBlockchainService {
    if (!UpgradedBlockchainService.instance) {
      UpgradedBlockchainService.instance = new UpgradedBlockchainService()
    }
    return UpgradedBlockchainService.instance
  }

  private setupEventHandlers(): void {
    // Handle balance updates from any source
    this.eventBus.on('balance:update', (data) => {
      // Balance updates are handled by the event bus
      console.debug('[UpgradedBlockchain] Balance update event:', data.wallet, data.network)
    })

    // Handle connection status changes
    this.eventBus.on('connection:status', (data) => {
      console.log('[UpgradedBlockchain] Connection status:', data.status)
    })

    // Handle errors
    this.eventBus.on('error', (data) => {
      console.error('[UpgradedBlockchain] Error from', data.source, ':', data.error)
    })
  }

  /**
   * Start monitoring a wallet with adaptive polling
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

    // Start adaptive polling
    this.pollingManager.startPolling(
      key,
      async () => {
        await this.fetchBalance(wallet, network)
      },
      { immediate: true }
    )

    // Store unsubscribe function for cleanup
    (wallet as any).__unsubscribe = unsubscribe
  }

  /**
   * Stop polling for a specific wallet
   */
  stopPolling(wallet: Wallet, network: Network): void {
    const key = `${wallet.address}_${network.id}`
    this.monitoringKeys.delete(key)
    
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
    // Stop all adaptive polling
    this.pollingManager.stopAll()
    this.monitoringKeys.clear()
  }

  /**
   * Fetch balance with all enhancements
   */
  private async fetchBalance(wallet: Wallet, network: Network): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    const cacheKey = `balance_${key}`
    
    // Get circuit breaker for this network
    const circuitBreaker = this.circuitFactory.getBreaker(`network_${network.id}`, {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenRequests: 2,
      timeout: 10000 // 10 second timeout
    })

    try {
      await circuitBreaker.execute(
        async () => {
          // Try to get from cache first
          const cachedBalance = await this.cacheManager.get<BlockchainBalance>(
            cacheKey,
            'balance',
            async () => {
              // If not in cache, fetch with deduplication
              return await this.deduplicator.deduplicate(
                cacheKey,
                async () => {
                  console.debug(`[UpgradedBlockchain] Fetching fresh balance for ${key}`)
                  return await originalBlockchainService.getBalance(wallet, network)
                },
                { ttl: 2000, cacheResult: false } // Don't cache in deduplicator, use our cache
              )
            }
          )

          if (cachedBalance) {
            // Emit balance update event
            this.eventBus.emit('balance:update', {
              wallet: wallet.address,
              network: network.id,
              balance: cachedBalance
            })
          }
        },
        async () => {
          // Fallback: try to get cached data
          console.warn(`[UpgradedBlockchain] Circuit breaker open for ${network.id}, using cached data`)
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
      console.error(`[UpgradedBlockchain] Failed to fetch balance for ${key}:`, error)
      this.eventBus.emit('error', {
        source: 'upgraded_blockchain_service',
        error: error as Error
      })
    }
  }

  /**
   * Get balance on-demand (not polling)
   */
  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    const key = `${wallet.address}_${network.id}`
    const cacheKey = `balance_${key}`
    const circuitBreaker = this.circuitFactory.getBreaker(`network_${network.id}`)

    return await circuitBreaker.execute(
      async () => {
        // Use cache manager with fetcher
        const balance = await this.cacheManager.get<BlockchainBalance>(
          cacheKey,
          'balance',
          async () => {
            return await this.deduplicator.deduplicate(
              cacheKey,
              async () => {
                const balance = await originalBlockchainService.getBalance(wallet, network)
                
                // Emit balance update event
                this.eventBus.emit('balance:update', {
                  wallet: wallet.address,
                  network: network.id,
                  balance
                })
                
                return balance
              },
              { ttl: 2000 }
            )
          }
        )

        if (!balance) {
          throw new Error('Failed to get balance')
        }

        return balance
      }
    )
  }

  /**
   * Delegate other methods to original service
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

    // Invalidate balance cache for this wallet
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

    // Invalidate balance cache
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
        wallets: Array.from(this.monitoringKeys)
      },
      polling: pollingStats,
      cache: cacheStats,
      circuitBreakers: circuitStats,
      deduplicator: this.deduplicator.getStats(),
      eventBus: {
        listeners: {
          'balance:update': this.eventBus.getListenerCount('balance:update'),
          'transaction:new': this.eventBus.getListenerCount('transaction:new'),
          'connection:status': this.eventBus.getListenerCount('connection:status'),
          'error': this.eventBus.getListenerCount('error')
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
    this.deduplicator.destroy()
  }
}

// Create singleton instance
export const upgradedBlockchainService = UpgradedBlockchainService.getInstance()

// For backward compatibility
export { upgradedBlockchainService as blockchainService }