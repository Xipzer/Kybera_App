import { db } from '../../storage/database'

export interface CacheEntry {
  key: string
  type: string
  data: any
  timestamp: number
  expiresAt: number
}

/**
 * Browser-compatible persistent cache using IndexedDB
 */
export class PersistentCache {
  private readonly tableName = 'blockchainCache'

  async get(key: string, type: string): Promise<any | null> {
    try {
      // Use raw Dexie table access
      const entry = await (db as any).table(this.tableName).get(`${type}_${key}`)
      
      if (entry && entry.expiresAt > Date.now()) {
        return entry.data
      } else if (entry) {
        // Clean up expired entry
        await this.delete(key, type)
      }
    } catch (error) {
      // Table might not exist yet
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PersistentCache] Get error:', error)
      }
    }
    return null
  }

  async set(key: string, type: string, data: any, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry = {
        key: `${type}_${key}`,
        type,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      }
      
      await (db as any).table(this.tableName).put(entry)
    } catch (error) {
      // Table might not exist yet
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PersistentCache] Set error:', error)
      }
    }
  }

  async delete(key: string, type: string): Promise<void> {
    try {
      await (db as any).table(this.tableName).delete(`${type}_${key}`)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PersistentCache] Delete error:', error)
      }
    }
  }

  async deleteByType(type: string): Promise<void> {
    try {
      const keys = await (db as any).table(this.tableName)
        .where('type')
        .equals(type)
        .primaryKeys()
      
      if (keys.length > 0) {
        await (db as any).table(this.tableName).bulkDelete(keys)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PersistentCache] Delete by type error:', error)
      }
    }
  }

  async clear(): Promise<void> {
    try {
      await (db as any).table(this.tableName).clear()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PersistentCache] Clear error:', error)
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now()
      await (db as any).table(this.tableName)
        .where('expiresAt')
        .below(now)
        .delete()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PersistentCache] Cleanup error:', error)
      }
    }
  }
}

// Singleton instance
export const persistentCache = new PersistentCache()