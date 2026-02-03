import { EventEmitter } from 'events'

export interface BalanceUpdateEvent {
  wallet: string
  network: string
  balance: any // Will be typed as BlockchainBalance
}

export interface PriceUpdateEvent {
  tokens: Array<{
    address: string
    price: number
    change24h?: number
  }>
}

export interface TransactionEvent {
  transaction: any // Will be typed as Transaction
}

export interface ConnectionStatusEvent {
  status: 'connected' | 'disconnected' | 'error'
  network?: string
}

export interface ActivityEvent {
  type: 'user' | 'background'
}

export interface TokenDiscoveryEvent {
  wallet: string
  chainId: number
  count: number
}

interface BlockchainEvents {
  'balance:update': BalanceUpdateEvent
  'price:update': PriceUpdateEvent
  'transaction:new': TransactionEvent
  'transaction:confirmed': TransactionEvent
  'connection:status': ConnectionStatusEvent
  'activity:detected': ActivityEvent
  'token:discovery:start': TokenDiscoveryEvent
  'token:discovery:complete': TokenDiscoveryEvent
  'cache:invalidate': { type: string; key?: string }
  'error': { source: string; error: Error }
}

export class BlockchainEventBus {
  private emitter = new EventEmitter()
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> = []
  private maxHistorySize = 100

  constructor() {
    // Increase max listeners to prevent warnings
    this.emitter.setMaxListeners(50)
  }

  emit<K extends keyof BlockchainEvents>(
    event: K,
    data: BlockchainEvents[K]
  ): void {
    this.emitter.emit(event, data)
    
    // Log event for debugging
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[BlockchainEvent] ${event}:`, data)
    }
    
    // Store in history
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now()
    })
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }
  }

  on<K extends keyof BlockchainEvents>(
    event: K,
    handler: (data: BlockchainEvents[K]) => void
  ): () => void {
    this.emitter.on(event, handler)
    
    // Return unsubscribe function
    return () => {
      this.emitter.off(event, handler)
    }
  }

  once<K extends keyof BlockchainEvents>(
    event: K,
    handler: (data: BlockchainEvents[K]) => void
  ): void {
    this.emitter.once(event, handler)
  }

  off<K extends keyof BlockchainEvents>(
    event: K,
    handler: (data: BlockchainEvents[K]) => void
  ): void {
    this.emitter.off(event, handler)
  }

  removeAllListeners(event?: keyof BlockchainEvents): void {
    if (event) {
      this.emitter.removeAllListeners(event)
    } else {
      this.emitter.removeAllListeners()
    }
  }

  getEventHistory(event?: string): Array<{ event: string; data: any; timestamp: number }> {
    if (event) {
      return this.eventHistory.filter(h => h.event === event)
    }
    return [...this.eventHistory]
  }

  clearHistory(): void {
    this.eventHistory = []
  }

  getListenerCount(event: keyof BlockchainEvents): number {
    return this.emitter.listenerCount(event)
  }
}

// Create singleton instance
export const blockchainEventBus = new BlockchainEventBus()