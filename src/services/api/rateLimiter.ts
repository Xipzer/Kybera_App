/**
 * Code by Xipzer
 */

type RequestPriority = 'high' | 'low'

interface QueuedRequest<T> {
  id: string
  priority: RequestPriority
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
  timestamp: number
}

interface RateLimitConfig {
  maxRequestsPerMinute: number
  maxRequestsPerHour: number
  minRequestInterval: number
}

export class RateLimiter {
  private static instance: RateLimiter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous queue of differently-typed requests
  private requestQueue: QueuedRequest<any>[] = []
  private requestHistory: number[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous in-flight request map
  private pendingRequests: Map<string, Promise<any>> = new Map()
  private isProcessing = false

  private config: RateLimitConfig = {
    maxRequestsPerMinute: 30,
    maxRequestsPerHour: 500,
    minRequestInterval: 500,
  }

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  async execute<T>(
    requestId: string,
    requestFn: () => Promise<T>,
    priority: RequestPriority = 'high',
  ): Promise<T> {
    const pending = this.pendingRequests.get(requestId)
    if (pending) return pending as Promise<T>

    const promise = new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        id: requestId,
        priority,
        execute: requestFn,
        resolve,
        reject,
        timestamp: Date.now(),
      })
      this.sortQueue()
    })

    this.pendingRequests.set(requestId, promise)
    promise.finally(() => this.pendingRequests.delete(requestId))
    this.processQueue()
    return promise
  }

  private sortQueue(): void {
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
      return a.timestamp - b.timestamp
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const now = Date.now()
      this.requestHistory = this.requestHistory.filter((t) => now - t < 3600000)

      if (!this.canMakeRequest()) {
        await new Promise((r) => setTimeout(r, this.config.minRequestInterval))
        continue
      }

      const request = this.requestQueue.shift()!

      const timeSinceLastRequest = now - (this.requestHistory[this.requestHistory.length - 1] || 0)
      if (timeSinceLastRequest < this.config.minRequestInterval) {
        await new Promise((r) =>
          setTimeout(r, this.config.minRequestInterval - timeSinceLastRequest),
        )
      }

      try {
        request.resolve(await request.execute())
        this.requestHistory.push(Date.now())
      } catch (error) {
        request.reject(error)
      }
    }

    this.isProcessing = false
  }

  private canMakeRequest(): boolean {
    const now = Date.now()

    if (
      this.requestHistory.filter((t) => now - t < 60000).length >= this.config.maxRequestsPerMinute
    )
      return false

    if (
      this.requestHistory.filter((t) => now - t < 3600000).length >= this.config.maxRequestsPerHour
    )
      return false

    return true
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getStatus() {
    const now = Date.now()
    return {
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size,
      requestsLastMinute: this.requestHistory.filter((t) => now - t < 60000).length,
      requestsLastHour: this.requestHistory.filter((t) => now - t < 3600000).length,
      config: this.config,
    }
  }
}

export const rateLimiter = RateLimiter.getInstance()
