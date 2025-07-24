// Memory protection service for sensitive data
import { securityService } from './securityService'

interface SensitiveData {
  id: string
  data: any
  timestamp: number
  accessCount: number
  lastAccess: number
}

class MemoryProtectionService {
  private sensitiveStore = new Map<string, SensitiveData>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly MAX_ACCESS_COUNT = 5
  private readonly MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
  private readonly CLEANUP_INTERVAL = 30 * 1000 // 30 seconds
  
  constructor() {
    this.startCleanupTimer()
  }
  
  // Store sensitive data with automatic cleanup
  storeSensitive(id: string, data: any, maxAgeMs?: number): void {
    // Clone the data to prevent external references
    const clonedData = this.deepClone(data)
    
    this.sensitiveStore.set(id, {
      id,
      data: clonedData,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now()
    })
    
    // Schedule automatic cleanup
    setTimeout(() => {
      this.wipeSensitive(id)
    }, maxAgeMs || this.MAX_AGE_MS)
  }
  
  // Retrieve sensitive data with access control
  getSensitive(id: string): any | null {
    const entry = this.sensitiveStore.get(id)
    if (!entry) return null
    
    // Check if data has expired
    if (Date.now() - entry.timestamp > this.MAX_AGE_MS) {
      this.wipeSensitive(id)
      return null
    }
    
    // Check access count
    entry.accessCount++
    entry.lastAccess = Date.now()
    
    if (entry.accessCount >= this.MAX_ACCESS_COUNT) {
      console.warn(`Sensitive data ${id} accessed ${entry.accessCount} times, wiping for security`)
      const data = this.deepClone(entry.data)
      this.wipeSensitive(id)
      return data
    }
    
    return this.deepClone(entry.data)
  }
  
  // Securely wipe sensitive data from memory
  wipeSensitive(id: string): void {
    const entry = this.sensitiveStore.get(id)
    if (!entry) return
    
    // Overwrite the data multiple times
    this.secureWipe(entry.data)
    
    // Remove from store
    this.sensitiveStore.delete(id)
  }
  
  // Wipe all sensitive data
  wipeAll(): void {
    this.sensitiveStore.forEach((entry) => {
      this.secureWipe(entry.data)
    })
    this.sensitiveStore.clear()
  }
  
  // Deep clone to prevent reference leaks
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime())
    if (obj instanceof Array) return obj.map(item => this.deepClone(item))
    if (obj instanceof Object) {
      const clonedObj: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key])
        }
      }
      return clonedObj
    }
  }
  
  // Secure wipe implementation
  private secureWipe(data: any): void {
    if (typeof data === 'string') {
      // For strings, we can't directly overwrite in JS, but we can
      // ensure references are cleared
      data = null
    } else if (data instanceof Uint8Array) {
      // Overwrite byte arrays
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.random() * 256)
      }
      data.fill(0)
    } else if (typeof data === 'object' && data !== null) {
      // Recursively wipe object properties
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          this.secureWipe(data[key])
          data[key] = null
          delete data[key]
        }
      }
    }
  }
  
  // Start automatic cleanup timer
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const toDelete: string[] = []
      
      this.sensitiveStore.forEach((entry, id) => {
        if (now - entry.timestamp > this.MAX_AGE_MS ||
            now - entry.lastAccess > this.MAX_AGE_MS) {
          toDelete.push(id)
        }
      })
      
      toDelete.forEach(id => this.wipeSensitive(id))
    }, this.CLEANUP_INTERVAL)
  }
  
  // Stop cleanup timer
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.wipeAll()
  }
}

// Singleton instance
export const memoryProtection = new MemoryProtectionService()

// Secure string handling utilities
export class SecureString {
  private chars: string[]
  
  constructor(value: string) {
    this.chars = value.split('')
  }
  
  // Get the value and immediately clear it
  useOnce(): string {
    const value = this.chars.join('')
    this.clear()
    return value
  }
  
  // Get value without clearing (use sparingly)
  peek(): string {
    return this.chars.join('')
  }
  
  // Clear the string from memory
  clear(): void {
    for (let i = 0; i < this.chars.length; i++) {
      this.chars[i] = String.fromCharCode(Math.floor(Math.random() * 256))
    }
    this.chars.length = 0
  }
}

// Wrapper for cryptographic operations with memory protection
export class SecureCrypto {
  // Encrypt with automatic key cleanup
  static async encrypt(data: string, password: string): Promise<string> {
    const keyId = `key_${Date.now()}_${Math.random()}`
    
    try {
      // Store password temporarily
      memoryProtection.storeSensitive(keyId, password, 10000) // 10 seconds max
      
      // Perform encryption (using your existing crypto utils)
      const { encryptData } = await import('../../utils/crypto')
      const encrypted = encryptData(data, password)
      
      return encrypted
    } finally {
      // Always clean up the key
      memoryProtection.wipeSensitive(keyId)
    }
  }
  
  // Decrypt with automatic key cleanup
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    const keyId = `key_${Date.now()}_${Math.random()}`
    
    try {
      // Store password temporarily
      memoryProtection.storeSensitive(keyId, password, 10000)
      
      // Perform decryption
      const { decryptData } = await import('../../utils/crypto')
      const decrypted = decryptData(encryptedData, password)
      
      return decrypted
    } finally {
      // Always clean up the key
      memoryProtection.wipeSensitive(keyId)
    }
  }
}

// React hook for sensitive data
export function useSensitiveData<T>(id: string, initialData?: T) {
  const storeData = (data: T) => {
    memoryProtection.storeSensitive(id, data)
  }
  
  const getData = (): T | null => {
    return memoryProtection.getSensitive(id) as T
  }
  
  const clearData = () => {
    memoryProtection.wipeSensitive(id)
  }
  
  // Store initial data if provided
  if (initialData !== undefined) {
    storeData(initialData)
  }
  
  // Cleanup on unmount
  const cleanup = () => clearData()
  
  return { storeData, getData, clearData, cleanup }
}

// Memory obfuscation for critical values
export class ObfuscatedValue {
  private parts: Uint8Array[]
  private xorKey: Uint8Array
  
  constructor(value: string) {
    // Generate random XOR key
    this.xorKey = new Uint8Array(value.length)
    crypto.getRandomValues(this.xorKey)
    
    // Convert string to bytes
    const encoder = new TextEncoder()
    const valueBytes = encoder.encode(value)
    
    // XOR with key and split into parts
    const xored = new Uint8Array(valueBytes.length)
    for (let i = 0; i < valueBytes.length; i++) {
      xored[i] = valueBytes[i] ^ this.xorKey[i]
    }
    
    // Split into random parts
    const numParts = 3 + Math.floor(Math.random() * 3)
    this.parts = []
    
    let offset = 0
    for (let i = 0; i < numParts - 1; i++) {
      const partSize = Math.floor(xored.length / numParts)
      this.parts.push(xored.slice(offset, offset + partSize))
      offset += partSize
    }
    this.parts.push(xored.slice(offset))
    
    // Shuffle parts
    for (let i = this.parts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.parts[i], this.parts[j]] = [this.parts[j], this.parts[i]]
    }
  }
  
  // Reconstruct the value
  reveal(): string {
    try {
      // Reassemble parts (need to maintain order)
      const combined = new Uint8Array(
        this.parts.reduce((acc, part) => acc + part.length, 0)
      )
      
      let offset = 0
      for (const part of this.parts) {
        combined.set(part, offset)
        offset += part.length
      }
      
      // XOR with key to get original
      const decoded = new Uint8Array(combined.length)
      for (let i = 0; i < combined.length; i++) {
        decoded[i] = combined[i] ^ this.xorKey[i]
      }
      
      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decoded)
    } finally {
      this.destroy()
    }
  }
  
  // Clear from memory
  destroy(): void {
    // Overwrite all parts
    for (const part of this.parts) {
      crypto.getRandomValues(part)
      part.fill(0)
    }
    
    // Overwrite XOR key
    crypto.getRandomValues(this.xorKey)
    this.xorKey.fill(0)
    
    this.parts = []
  }
}

// Enhanced security service initialization
export function initializeMemoryProtection() {
  // Set up global error handler to wipe sensitive data on crash
  if (typeof window !== 'undefined') {
    window.addEventListener('error', () => {
      console.warn('Error detected, wiping sensitive data')
      memoryProtection.wipeAll()
    })
    
    // Wipe on page unload
    window.addEventListener('beforeunload', () => {
      memoryProtection.wipeAll()
    })
    
    // Periodic memory pressure check
    if ('performance' in window && 'memory' in (performance as any)) {
      setInterval(() => {
        const memory = (performance as any).memory
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
        
        if (usageRatio > 0.9) {
          console.warn('High memory usage detected, cleaning sensitive data')
          memoryProtection.wipeAll()
        }
      }, 60000) // Check every minute
    }
  }
  
  // Initialize main security service
  securityService.initializeSecurityMeasures()
}