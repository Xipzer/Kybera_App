interface QueuedRequest<T> {
  id: string
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason: any) => void
  timestamp: number
}

interface RateLimitConfig {
  maxRequestsPerMinute: number
  maxRequestsPerHour: number
  minRequestInterval: number // milliseconds
}

export class RateLimiter {
  private static instance: RateLimiter
  private requestQueue: QueuedRequest<any>[] = []
  private requestHistory: number[] = []
  private pendingRequests: Map<string, Promise<any>> = new Map()
  private isProcessing = false
  
  private config: RateLimitConfig = {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100,
    minRequestInterval: 1000 // 1 second between requests
  }
  
  private constructor() {}
  
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }
  
  /**
   * Execute a request with rate limiting and deduplication
   */
  async execute<T>(
    requestId: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if this exact request is already pending
    const pending = this.pendingRequests.get(requestId)
    if (pending) {
      console.debug(`Request ${requestId} already pending, returning existing promise`)
      return pending as Promise<T>
    }
    
    // Create a promise for this request
    const promise = new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        id: requestId,
        execute: requestFn,
        resolve,
        reject,
        timestamp: Date.now()
      })
    })
    
    // Store as pending
    this.pendingRequests.set(requestId, promise)
    
    // Clean up when done
    promise.finally(() => {
      this.pendingRequests.delete(requestId)
    })
    
    // Start processing if not already
    this.processQueue()
    
    return promise
  }
  
  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }
    
    this.isProcessing = true
    
    while (this.requestQueue.length > 0) {
      // Clean up old request history
      const now = Date.now()
      this.requestHistory = this.requestHistory.filter(
        timestamp => now - timestamp < 3600000 // Keep last hour
      )
      
      // Check rate limits
      if (!this.canMakeRequest()) {
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, this.config.minRequestInterval))
        continue
      }
      
      // Get next request
      const request = this.requestQueue.shift()!
      
      // Ensure minimum interval between requests
      const lastRequestTime = this.requestHistory[this.requestHistory.length - 1] || 0
      const timeSinceLastRequest = now - lastRequestTime
      if (timeSinceLastRequest < this.config.minRequestInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.minRequestInterval - timeSinceLastRequest)
        )
      }
      
      // Execute request
      try {
        const result = await request.execute()
        request.resolve(result)
        this.requestHistory.push(Date.now())
      } catch (error) {
        request.reject(error)
      }
    }
    
    this.isProcessing = false
  }
  
  /**
   * Check if we can make a request based on rate limits
   */
  private canMakeRequest(): boolean {
    const now = Date.now()
    
    // Check per-minute limit
    const requestsLastMinute = this.requestHistory.filter(
      timestamp => now - timestamp < 60000
    ).length
    if (requestsLastMinute >= this.config.maxRequestsPerMinute) {
      return false
    }
    
    // Check per-hour limit
    const requestsLastHour = this.requestHistory.filter(
      timestamp => now - timestamp < 3600000
    ).length
    if (requestsLastHour >= this.config.maxRequestsPerHour) {
      return false
    }
    
    return true
  }
  
  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }
  }
  
  /**
   * Get current queue status
   */
  getStatus() {
    const now = Date.now()
    return {
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size,
      requestsLastMinute: this.requestHistory.filter(
        timestamp => now - timestamp < 60000
      ).length,
      requestsLastHour: this.requestHistory.filter(
        timestamp => now - timestamp < 3600000
      ).length,
      config: this.config
    }
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance()