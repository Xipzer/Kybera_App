import { blockchainService as originalBlockchainService } from './blockchainService'
import type { BlockchainBalance } from './blockchainService'

// Re-export BlockchainBalance for backward compatibility
export type { BlockchainBalance }
import { blockchainEventBus, circuitBreakerFactory, balanceRequestDeduplicator } from './core'
import { Wallet, Network } from '../../types'

export class EnhancedBlockchainService {
  private pollingCallbacks = new Map<string, (balance: BlockchainBalance) => void>()

  constructor(
    private eventBus = blockchainEventBus,
    private circuitFactory = circuitBreakerFactory,
    private deduplicator = balanceRequestDeduplicator
  ) {
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Listen for balance updates from any source
    this.eventBus.on('balance:update', (data) => {
      const key = `${data.wallet}_${data.network}`
      const callback = this.pollingCallbacks.get(key)
      if (callback) {
        callback(data.balance)
      }
    })
  }

  /**
   * Enhanced version of startPolling that uses the new infrastructure
   */
  async startPolling(
    wallet: Wallet,
    network: Network,
    onUpdate: (balance: BlockchainBalance) => void
  ): Promise<void> {
    const key = `${wallet.address}_${network.id}`
    
    // Store callback for event-based updates
    this.pollingCallbacks.set(key, onUpdate)

    // Get circuit breaker for this network
    const circuitBreaker = this.circuitFactory.getBreaker(`network_${network.id}`, {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenRequests: 2
    })

    // Enhanced polling function with circuit breaker and deduplication
    const enhancedPoll = async () => {
      try {
        await circuitBreaker.execute(
          async () => {
            // Deduplicate concurrent balance requests
            const balance = await this.deduplicator.deduplicate(
              `balance_${key}`,
              async () => {
                return await originalBlockchainService.getBalance(wallet, network)
              },
              { ttl: 2000, cacheResult: true }
            )

            // Emit balance update event
            this.eventBus.emit('balance:update', {
              wallet: wallet.address,
              network: network.id,
              balance
            })

            return balance
          },
          async () => {
            // Fallback: emit cached balance if available
            console.warn(`Circuit breaker open for ${network.id}, using cached data`)
            // The cached data will be available from the deduplicator
          }
        )
      } catch (error) {
        console.error(`Enhanced polling error for ${key}:`, error)
        this.eventBus.emit('error', {
          source: 'enhanced_polling',
          error: error as Error
        })
      }
    }

    // Start original polling
    originalBlockchainService.startPolling(wallet, network, onUpdate)

    // Override with enhanced polling logic by doing immediate poll
    // The event bus will handle the callback
    enhancedPoll()
  }

  /**
   * Stop polling for a specific wallet and network
   */
  stopPolling(wallet: Wallet, network: Network): void {
    const key = `${wallet.address}_${network.id}`
    this.pollingCallbacks.delete(key)
    originalBlockchainService.stopPolling(wallet, network)
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollingCallbacks.clear()
    originalBlockchainService.stopAllPolling()
  }

  /**
   * Enhanced getBalance with circuit breaker and deduplication
   */
  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    const key = `${wallet.address}_${network.id}`
    const circuitBreaker = this.circuitFactory.getBreaker(`network_${network.id}`)

    return circuitBreaker.execute(
      async () => {
        return this.deduplicator.deduplicate(
          `balance_${key}`,
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
          { ttl: 2000, cacheResult: true }
        )
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
   * Get stats for monitoring
   */
  getStats() {
    return {
      circuitBreakers: this.circuitFactory.getStats(),
      deduplicator: this.deduplicator.getStats(),
      eventBus: {
        listeners: {
          'balance:update': this.eventBus.getListenerCount('balance:update'),
          'transaction:new': this.eventBus.getListenerCount('transaction:new'),
          'error': this.eventBus.getListenerCount('error')
        }
      }
    }
  }
}

// Create enhanced instance
export const enhancedBlockchainService = new EnhancedBlockchainService()

// For backward compatibility, export with the same name as original
export { enhancedBlockchainService as blockchainService }