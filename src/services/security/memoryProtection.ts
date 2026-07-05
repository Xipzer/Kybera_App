/**
 * Code by Xipzer
 */

import { securityService } from './securityService'

interface SensitiveData {
  id: string
  data: unknown
  timestamp: number
  accessCount: number
  lastAccess: number
}

class MemoryProtectionService {
  private sensitiveStore = new Map<string, SensitiveData>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly MAX_ACCESS_COUNT = 5
  private readonly MAX_AGE_MS = 5 * 60 * 1000
  private readonly CLEANUP_INTERVAL = 30 * 1000

  constructor() {
    this.startCleanupTimer()
  }

  storeSensitive(id: string, data: unknown, maxAgeMs?: number): void {
    this.sensitiveStore.set(id, {
      id,
      data: this.deepClone(data),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
    })

    setTimeout(() => {
      this.wipeSensitive(id)
    }, maxAgeMs || this.MAX_AGE_MS)
  }

  getSensitive<T = unknown>(id: string): T | null {
    const entry = this.sensitiveStore.get(id)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.MAX_AGE_MS) {
      this.wipeSensitive(id)
      return null
    }

    entry.accessCount++
    entry.lastAccess = Date.now()

    if (entry.accessCount >= this.MAX_ACCESS_COUNT) {
      console.warn(`Sensitive data ${id} accessed ${entry.accessCount} times, wiping for security`)
      const data = this.deepClone(entry.data)
      this.wipeSensitive(id)
      return data as T
    }

    return this.deepClone(entry.data) as T
  }

  wipeSensitive(id: string): void {
    const entry = this.sensitiveStore.get(id)
    if (!entry) return

    this.secureWipe(entry.data)

    this.sensitiveStore.delete(id)
  }

  wipeAll(): void {
    this.sensitiveStore.forEach((entry) => {
      this.secureWipe(entry.data)
    })
    this.sensitiveStore.clear()
  }

  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime())
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item))
    if (obj instanceof Object) {
      const source = obj as Record<string, unknown>
      const clonedObj: Record<string, unknown> = {}
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          clonedObj[key] = this.deepClone(source[key])
        }
      }
      return clonedObj
    }
  }

  private secureWipe(data: unknown): void {
    if (typeof data === 'string') {
      data = null
    } else if (data instanceof Uint8Array) {
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.random() * 256)
      }
      data.fill(0)
    } else if (typeof data === 'object' && data !== null) {
      const target = data as Record<string, unknown>
      for (const key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
          this.secureWipe(target[key])
          target[key] = null
          delete target[key]
        }
      }
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const toDelete: string[] = []

      this.sensitiveStore.forEach((entry, id) => {
        if (now - entry.timestamp > this.MAX_AGE_MS || now - entry.lastAccess > this.MAX_AGE_MS) {
          toDelete.push(id)
        }
      })

      toDelete.forEach((id) => this.wipeSensitive(id))
    }, this.CLEANUP_INTERVAL)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.wipeAll()
  }
}

export const memoryProtection = new MemoryProtectionService()

export class SecureString {
  private chars: string[]
  
  constructor(value: string) {
    this.chars = value.split('')
  }
  
  useOnce(): string {
    const value = this.chars.join('')
    this.clear()
    return value
  }
  
  peek(): string {
    return this.chars.join('')
  }
  
  clear(): void {
    for (let i = 0; i < this.chars.length; i++) {
      this.chars[i] = String.fromCharCode(Math.floor(Math.random() * 256))
    }
    this.chars.length = 0
  }
}

export class SecureCrypto {
  static async encrypt(data: string, password: string): Promise<string> {
    const keyId = `key_${Date.now()}_${Math.random()}`
    
    try {
      memoryProtection.storeSensitive(keyId, password, 10000)
      
      const { encryptData } = await import('../../utils/crypto')
      
      return await encryptData(data, password)
    } finally {
      memoryProtection.wipeSensitive(keyId)
    }
  }
  
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    const keyId = `key_${Date.now()}_${Math.random()}`
    
    try {
      memoryProtection.storeSensitive(keyId, password, 10000)
      
      const { decryptData } = await import('../../utils/crypto')
      
      return await decryptData(encryptedData, password)
    } finally {
      memoryProtection.wipeSensitive(keyId)
    }
  }
}

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
  
  if (initialData !== undefined) {
    storeData(initialData)
  }
  
  return { storeData, getData, clearData, cleanup: () => clearData() }
}

export class ObfuscatedValue {
  private parts: Uint8Array[]
  private xorKey: Uint8Array
  
  constructor(value: string) {
    this.xorKey = new Uint8Array(value.length)
    crypto.getRandomValues(this.xorKey)
    
    const valueBytes = new TextEncoder().encode(value)
    
    const xored = new Uint8Array(valueBytes.length)
    for (let i = 0; i < valueBytes.length; i++) {
      xored[i] = valueBytes[i] ^ this.xorKey[i]
    }
    
    const numParts = 3 + Math.floor(Math.random() * 3)
    this.parts = []
    
    let offset = 0
    for (let i = 0; i < numParts - 1; i++) {
      const partSize = Math.floor(xored.length / numParts)
      this.parts.push(xored.slice(offset, offset + partSize))
      offset += partSize
    }
    this.parts.push(xored.slice(offset))
    
    for (let i = this.parts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.parts[i], this.parts[j]] = [this.parts[j], this.parts[i]]
    }
  }
  
  reveal(): string {
    try {
      const combined = new Uint8Array(
        this.parts.reduce((acc, part) => acc + part.length, 0)
      )
      
      let offset = 0
      for (const part of this.parts) {
        combined.set(part, offset)
        offset += part.length
      }
      
      const decoded = new Uint8Array(combined.length)
      for (let i = 0; i < combined.length; i++) {
        decoded[i] = combined[i] ^ this.xorKey[i]
      }
      
      return new TextDecoder().decode(decoded)
    } finally {
      this.destroy()
    }
  }
  
  destroy(): void {
    for (const part of this.parts) {
      crypto.getRandomValues(part)
      part.fill(0)
    }
    
    crypto.getRandomValues(this.xorKey)
    this.xorKey.fill(0)
    
    this.parts = []
  }
}

export function initializeMemoryProtection() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', () => {
      console.warn('Error detected, wiping sensitive data')
      memoryProtection.wipeAll()
    })
    
    window.addEventListener('beforeunload', () => {
      memoryProtection.wipeAll()
    })
    
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
    if ('performance' in window && perf.memory) {
      setInterval(() => {
        const memory = perf.memory!
        if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
          console.warn('High memory usage detected, cleaning sensitive data')
          memoryProtection.wipeAll()
        }
      }, 60000)
    }
  }
  
  securityService.initializeSecurityMeasures()
}