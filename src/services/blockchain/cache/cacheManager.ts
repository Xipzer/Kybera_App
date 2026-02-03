/**
 * Unified Cache Manager with Memory + IndexedDB Persistence
 */

import { blockchainEventBus } from '../core/eventBus'
import { db } from '../../storage/database'

// ==================== Persistent Cache (IndexedDB) ====================

interface PersistentCacheEntry {
  key: string
  type: string
  data: any
  timestamp: number
  expiresAt: number
}

class PersistentCache {
  private readonly tableName = 'blockchainCache'

  async get(key: string, type: string): Promise<any | null> {
    try {
      const entry = await (db as any).table(this.tableName).get(`${type}_${key}`)
      if (entry && entry.expiresAt > Date.now()) {
        return entry.data
      } else if (entry) {
        await this.delete(key, type)
      }
    } catch (error) {
      // Table might not exist yet
    }
    return null
  }

  async set(key: string, type: string, data: any, ttl: number): Promise<void> {
    try {
      const entry: PersistentCacheEntry = {
        key: `${type}_${key}`,
        type,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      }
      await (db as any).table(this.tableName).put(entry)
    } catch (error) {
      // Table might not exist yet
    }
  }

  async delete(key: string, type: string): Promise<void> {
    try {
      await (db as any).table(this.tableName).delete(`${type}_${key}`)
    } catch (error) {
      // Ignore
    }
  }

  async deleteByType(type: string): Promise<void> {
    try {
      const keys = await (db as any).table(this.tableName).where('type').equals(type).primaryKeys()
      if (keys.length > 0) {
        await (db as any).table(this.tableName).bulkDelete(keys)
      }
    } catch (error) {
      // Ignore
    }
  }

  async clear(): Promise<void> {
    try {
      await (db as any).table(this.tableName).clear()
    } catch (error) {
      // Ignore
    }
  }
}

const persistentCache = new PersistentCache()

// ==================== Memory Cache Manager ====================

export interface CacheStrategy {
  maxAge: number
  maxSize: number
  priority: 'high' | 'medium' | 'low'
  invalidateOn?: string[]
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  size: number
  priority: CacheStrategy['priority']
  type: string
}

export class CacheManager {
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
    this.setCacheStrategy('balance', {
      maxAge: 30000,
      maxSize: 1024,
      priority: 'high',
      invalidateOn: ['transaction:new', 'balance:update'],
    })

    this.setCacheStrategy('price', {
      maxAge: 300000,
      maxSize: 512,
      priority: 'medium',
      invalidateOn: ['price:update'],
    })

    this.setCacheStrategy('metadata', {
      maxAge: 86400000,
      maxSize: 2048,
      priority: 'low',
      invalidateOn: [],
    })

    this.setCacheStrategy('transaction', {
      maxAge: 3600000,
      maxSize: 4096,
      priority: 'medium',
      invalidateOn: ['transaction:new', 'transaction:confirmed'],
    })

    this.setCacheStrategy('network', {
      maxAge: 60000,
      maxSize: 256,
      priority: 'high',
      invalidateOn: ['connection:status'],
    })
  }

  private setupEventListeners(): void {
    for (const [type, strategy] of this.cacheStrategies) {
      if (strategy.invalidateOn?.length) {
        strategy.invalidateOn.forEach((eventName) => {
          const unsubscribe = blockchainEventBus.on(eventName as any, () => {
            this.invalidateByType(type)
          })
          this.eventUnsubscribers.push(unsubscribe)
        })
      }
    }

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
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000)
  }

  setCacheStrategy(type: string, strategy: CacheStrategy): void {
    this.cacheStrategies.set(type, strategy)
  }

  async get<T>(key: string, type: string, fetcher?: () => Promise<T>): Promise<T | null> {
    const cached = this.memoryCache.get(key)

    if (cached && cached.type === type) {
      const strategy = this.cacheStrategies.get(type)
      const age = Date.now() - cached.timestamp

      if (strategy && age < strategy.maxAge) {
        cached.hits++
        return cached.data as T
      } else {
        this.memoryCache.delete(key)
        this.totalSize -= cached.size
      }
    }

    if (!cached) {
      const persistentData = await persistentCache.get(key, type)
      if (persistentData) {
        await this.set(key, type, persistentData)
        return persistentData
      }
    }

    if (fetcher) {
      try {
        const data = await fetcher()
        await this.set(key, type, data)
        return data
      } catch (error) {
        throw error
      }
    }

    return null
  }

  async set<T>(key: string, type: string, data: T): Promise<void> {
    const strategy = this.cacheStrategies.get(type) || {
      maxAge: 300000,
      maxSize: 1024,
      priority: 'low' as const,
    }

    const size = this.estimateSize(data)

    if (this.totalSize + size > this.maxTotalSize) {
      await this.evictLRU(size)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      size,
      priority: strategy.priority,
      type,
    }

    this.memoryCache.set(key, entry)
    this.totalSize += size

    if (strategy.priority !== 'low') {
      await persistentCache.set(key, type, data, strategy.maxAge)
    }
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => {
        const priorityOrder = { low: 0, medium: 1, high: 2 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        const scoreA = a.hits / Math.max(1, Date.now() - a.timestamp)
        const scoreB = b.hits / Math.max(1, Date.now() - b.timestamp)
        return scoreA - scoreB
      })

    let freedSpace = 0
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break
      this.memoryCache.delete(entry.key)
      freedSpace += entry.size
      this.totalSize -= entry.size
    }
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2
    } catch {
      return 1024
    }
  }

  invalidate(key: string): void {
    const entry = this.memoryCache.get(key)
    if (entry) {
      this.totalSize -= entry.size
      this.memoryCache.delete(key)
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
    keysToDelete.forEach((key) => this.memoryCache.delete(key))
    persistentCache.deleteByType(type)
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
    keysToDelete.forEach((key) => this.memoryCache.delete(key))
  }

  clear(): void {
    this.memoryCache.clear()
    this.totalSize = 0
    persistentCache.clear()
  }

  getStats() {
    let totalHits = 0
    let totalRequests = 0
    const breakdown: Record<string, { count: number; size: number }> = {}

    for (const entry of this.memoryCache.values()) {
      totalHits += entry.hits
      totalRequests += entry.hits + 1

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
      breakdown,
    }
  }

  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval)
    this.eventUnsubscribers.forEach((unsub) => unsub())
    this.eventUnsubscribers = []
    this.clear()
  }
}

export const cacheManager = new CacheManager()
