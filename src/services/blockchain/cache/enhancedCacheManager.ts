import { blockchainEventBus } from '../core/eventBus'
import { persistentCache } from './persistentCache'

export interface CacheStrategy {
  maxAge: number
  maxSize: number
  priority: 'high' | 'medium' | 'low'
  invalidateOn?: string[] // Event names that invalidate this cache
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  size: number
  priority: CacheStrategy['priority']
  type: string
}


export class EnhancedCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private cacheStrategies = new Map<string, CacheStrategy>()
  private totalSize = 0
  private maxTotalSize: number
  private eventUnsubscribers: Array<() => void> = []
  private cleanupInterval?: NodeJS.Timeout

  constructor(maxSizeMB: number = 50) {
    this.maxTotalSize = maxSizeMB * 1024 * 1024
    this.setupDefaultStrategies()
    this.setupEventListeners()
    this.startPeriodicCleanup()
  }

  private setupDefaultStrategies(): void {
    // Balance data - high priority, short cache
    this.setCacheStrategy('balance', {
      maxAge: 30000, // 30 seconds
      maxSize: 1024, // 1KB per entry
      priority: 'high',
      invalidateOn: ['transaction:new', 'balance:update']
    })

    // Price data - medium priority, medium cache
    this.setCacheStrategy('price', {
      maxAge: 300000, // 5 minutes
      maxSize: 512,
      priority: 'medium',
      invalidateOn: ['price:update']
    })

    // Token metadata - low priority, long cache
    this.setCacheStrategy('metadata', {
      maxAge: 86400000, // 24 hours
      maxSize: 2048,
      priority: 'low',
      invalidateOn: []
    })

    // Transaction data - medium priority
    this.setCacheStrategy('transaction', {
      maxAge: 3600000, // 1 hour
      maxSize: 4096,
      priority: 'medium',
      invalidateOn: ['transaction:new', 'transaction:confirmed']
    })

    // Network data - high priority, short cache
    this.setCacheStrategy('network', {
      maxAge: 60000, // 1 minute
      maxSize: 256,
      priority: 'high',
      invalidateOn: ['connection:status']
    })
  }

  private setupEventListeners(): void {
    // Set up invalidation listeners for each cache type
    for (const [type, strategy] of this.cacheStrategies) {
      if (strategy.invalidateOn && strategy.invalidateOn.length > 0) {
        strategy.invalidateOn.forEach(eventName => {
          const unsubscribe = blockchainEventBus.on(eventName as any, () => {
            console.debug(`[CacheManager] Invalidating ${type} cache due to ${eventName}`)
            this.invalidateByType(type)
          })
          this.eventUnsubscribers.push(unsubscribe)
        })
      }
    }

    // Listen for cache invalidation events
    const unsubInvalidate = blockchainEventBus.on('cache:invalidate', (data) => {
      if (data.key) {
        this.invalidate(data.key)
      } else if (data.type) {
        this.invalidateByType(data.type)
      }
    })
    this.eventUnsubscribers.push(unsubInvalidate)
  }

  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, 5 * 60 * 1000)
  }

  setCacheStrategy(type: string, strategy: CacheStrategy): void {
    this.cacheStrategies.set(type, strategy)
  }

  async get<T>(
    key: string,
    type: string,
    fetcher?: () => Promise<T>
  ): Promise<T | null> {
    // Check memory cache first
    const cached = this.memoryCache.get(key)
    
    if (cached && cached.type === type) {
      const strategy = this.cacheStrategies.get(type)
      const age = Date.now() - cached.timestamp
      
      if (strategy && age < strategy.maxAge) {
        cached.hits++
        console.debug(`[CacheManager] Cache hit for ${key} (${type})`)
        return cached.data as T
      } else {
        // Cache expired
        console.debug(`[CacheManager] Cache expired for ${key} (${type})`)
        this.memoryCache.delete(key)
        this.totalSize -= cached.size
      }
    }

    // Check persistent cache if not in memory
    if (!cached) {
      const persistentData = await this.getPersistent<T>(key, type)
      if (persistentData) {
        // Re-hydrate to memory cache
        await this.set(key, type, persistentData)
        return persistentData
      }
    }

    // Fetch if fetcher provided
    if (fetcher) {
      try {
        console.debug(`[CacheManager] Cache miss for ${key} (${type}), fetching...`)
        const data = await fetcher()
        await this.set(key, type, data)
        return data
      } catch (error) {
        console.error(`[CacheManager] Fetch error for ${key}:`, error)
        throw error
      }
    }

    return null
  }

  async set<T>(key: string, type: string, data: T): Promise<void> {
    const strategy = this.cacheStrategies.get(type) || {
      maxAge: 300000,
      maxSize: 1024,
      priority: 'low'
    }

    const size = this.estimateSize(data)

    // Check if we need to evict entries
    if (this.totalSize + size > this.maxTotalSize) {
      await this.evictLRU(size)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      size,
      priority: strategy.priority,
      type
    }

    this.memoryCache.set(key, entry)
    this.totalSize += size

    // Persist important data
    if (strategy.priority !== 'low') {
      await this.setPersistent(key, type, data)
    }
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => {
        // Sort by priority first, then by LRU score
        const priorityOrder = { low: 0, medium: 1, high: 2 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        
        if (priorityDiff !== 0) return priorityDiff
        
        // LRU score: combination of age and hits
        const scoreA = a.hits / Math.max(1, Date.now() - a.timestamp)
        const scoreB = b.hits / Math.max(1, Date.now() - b.timestamp)
        
        return scoreA - scoreB
      })

    let freedSpace = 0
    const evicted: string[] = []

    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break
      
      this.memoryCache.delete(entry.key)
      freedSpace += entry.size
      this.totalSize -= entry.size
      evicted.push(entry.key)
    }

    if (evicted.length > 0) {
      console.debug(`[CacheManager] Evicted ${evicted.length} entries to free ${freedSpace} bytes`)
    }
  }

  private estimateSize(data: any): number {
    // Rough estimation of object size in bytes
    try {
      return JSON.stringify(data).length * 2 // 2 bytes per character
    } catch {
      return 1024 // Default 1KB for non-serializable objects
    }
  }

  private async getPersistent<T>(key: string, type: string): Promise<T | null> {
    return persistentCache.get(key, type)
  }

  private async setPersistent(key: string, type: string, data: any): Promise<void> {
    const strategy = this.cacheStrategies.get(type)
    const ttl = strategy?.maxAge || 300000 // Default 5 minutes
    return persistentCache.set(key, type, data, ttl)
  }

  invalidate(key: string): void {
    const entry = this.memoryCache.get(key)
    if (entry) {
      this.totalSize -= entry.size
      this.memoryCache.delete(key)
      
      // Also remove from persistent cache
      persistentCache.delete(key, entry.type)
    }
  }

  invalidateByType(type: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.type === type) {
        keysToDelete.push(key)
        this.totalSize -= entry.size
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key))
    
    // Clear persistent cache for this type
    persistentCache.deleteByType(type)
    
    console.debug(`[CacheManager] Invalidated ${keysToDelete.length} ${type} cache entries`)
  }

  private cleanupExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.memoryCache) {
      const strategy = this.cacheStrategies.get(entry.type)
      if (strategy && now - entry.timestamp > strategy.maxAge) {
        keysToDelete.push(key)
        this.totalSize -= entry.size
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.debug(`[CacheManager] Cleaned up ${keysToDelete.length} expired entries`)
    }
  }

  clear(): void {
    this.memoryCache.clear()
    this.totalSize = 0
    
    // Clear all persistent cache
    persistentCache.clear()
  }

  getStats(): {
    entries: number
    totalSize: number
    totalSizeMB: number
    hitRate: number
    breakdown: Record<string, { count: number; size: number }>
  } {
    let totalHits = 0
    let totalRequests = 0
    const breakdown: Record<string, { count: number; size: number }> = {}
    
    for (const entry of this.memoryCache.values()) {
      totalHits += entry.hits
      totalRequests += entry.hits + 1 // +1 for initial set
      
      if (!breakdown[entry.type]) {
        breakdown[entry.type] = { count: 0, size: 0 }
      }
      breakdown[entry.type].count++
      breakdown[entry.type].size += entry.size
    }
    
    return {
      entries: this.memoryCache.size,
      totalSize: this.totalSize,
      totalSizeMB: this.totalSize / (1024 * 1024),
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      breakdown
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.eventUnsubscribers.forEach(unsub => unsub())
    this.eventUnsubscribers = []
    
    this.clear()
  }
}

// Create singleton instance
export const enhancedCacheManager = new EnhancedCacheManager()