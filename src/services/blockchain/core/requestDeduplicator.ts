interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
  waiters: number
}

export interface DeduplicationOptions {
  ttl?: number // Time to live for deduplication in milliseconds
  maxWaiters?: number // Maximum number of waiting requests
  cacheResult?: boolean // Whether to cache successful results
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>()
  private cachedResults = new Map<string, { data: any; timestamp: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor(
    private defaultTTL: number = 5000, // 5 seconds default
    private maxCacheSize: number = 100
  ) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Clean up every minute
  }

  async deduplicate<T>(
    key: string,
    operation: () => Promise<T>,
    options: DeduplicationOptions = {}
  ): Promise<T> {
    const ttl = options.ttl ?? this.defaultTTL
    const maxWaiters = options.maxWaiters ?? Infinity
    const cacheResult = options.cacheResult ?? false

    // Check cached results first
    if (cacheResult) {
      const cached = this.cachedResults.get(key)
      if (cached && Date.now() - cached.timestamp < ttl) {
        console.debug(`[RequestDedup] Returning cached result for ${key}`)
        return cached.data as T
      }
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key)
    if (pending) {
      // Check if we've exceeded max waiters
      if (pending.waiters >= maxWaiters) {
        throw new Error(`Too many pending requests for ${key} (max: ${maxWaiters})`)
      }

      pending.waiters++
      console.debug(`[RequestDedup] Deduplicating request ${key}, ${pending.waiters} waiters`)

      try {
        return await pending.promise
      } finally {
        pending.waiters--
      }
    }

    // Create new request
    const promise = this.executeOperation(key, operation, ttl, cacheResult)
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      waiters: 0
    })

    return promise
  }

  private async executeOperation<T>(
    key: string,
    operation: () => Promise<T>,
    ttl: number,
    cacheResult: boolean
  ): Promise<T> {
    try {
      const result = await operation()

      // Cache successful result if requested
      if (cacheResult) {
        this.cacheResult(key, result)
      }

      // Keep pending for TTL to deduplicate rapid successive calls
      setTimeout(() => {
        this.pendingRequests.delete(key)
      }, ttl)

      return result
    } catch (error) {
      // Remove from pending immediately on error
      this.pendingRequests.delete(key)
      throw error
    }
  }

  private cacheResult(key: string, data: any): void {
    // Enforce cache size limit
    if (this.cachedResults.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = this.findOldestCacheKey()
      if (oldestKey) {
        this.cachedResults.delete(oldestKey)
      }
    }

    this.cachedResults.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  private findOldestCacheKey(): string | undefined {
    let oldestKey: string | undefined
    let oldestTime = Infinity

    for (const [key, value] of this.cachedResults) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  private cleanup(): void {
    const now = Date.now()

    // Clean up expired pending requests
    for (const [key, pending] of this.pendingRequests) {
      if (now - pending.timestamp > this.defaultTTL * 2 && pending.waiters === 0) {
        this.pendingRequests.delete(key)
      }
    }

    // Clean up expired cached results
    for (const [key, cached] of this.cachedResults) {
      if (now - cached.timestamp > this.defaultTTL * 10) {
        this.cachedResults.delete(key)
      }
    }
  }

  clear(pattern?: string | RegExp): void {
    if (pattern) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
      
      // Clear matching pending requests
      for (const key of this.pendingRequests.keys()) {
        if (regex.test(key)) {
          this.pendingRequests.delete(key)
        }
      }
      
      // Clear matching cached results
      for (const key of this.cachedResults.keys()) {
        if (regex.test(key)) {
          this.cachedResults.delete(key)
        }
      }
    } else {
      // Clear all
      this.pendingRequests.clear()
      this.cachedResults.clear()
    }
  }

  getPendingCount(): number {
    return this.pendingRequests.size
  }

  getCachedCount(): number {
    return this.cachedResults.size
  }

  getStats(): {
    pending: number
    cached: number
    pendingKeys: string[]
    cachedKeys: string[]
  } {
    return {
      pending: this.pendingRequests.size,
      cached: this.cachedResults.size,
      pendingKeys: Array.from(this.pendingRequests.keys()),
      cachedKeys: Array.from(this.cachedResults.keys())
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

// Create a shared instance for balance-related requests
export const balanceRequestDeduplicator = new RequestDeduplicator(2000, 50)

// Create a shared instance for price-related requests
export const priceRequestDeduplicator = new RequestDeduplicator(30000, 20)

// Create a shared instance for transaction-related requests
export const transactionRequestDeduplicator = new RequestDeduplicator(5000, 30)