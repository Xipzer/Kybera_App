import { db } from '../storage/database'

export interface PriceData {
  [symbol: string]: {
    usd: number
    usd_24h_change: number
  }
}

interface PriceRequest {
  symbols?: string[]
  contractAddresses?: { platform: string; addresses: string[] }
  resolve: (value: PriceData) => void
  reject: (reason: any) => void
  timestamp: number
}

class PriceService {
  // Cache durations
  private HOT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes (was 1 minute)
  private COLD_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  // Rate limiting
  private MAX_REQUESTS_PER_MINUTE = 10 // CoinGecko free tier limit
  private requestCount = 0
  private requestResetTime = Date.now() + 60000

  // Request batching
  private requestQueue: PriceRequest[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private BATCH_DELAY = 100 // ms to wait for batching requests
  private MAX_BATCH_SIZE = 100 // Max tokens per CoinGecko request

  // Request deduplication
  private pendingRequests = new Map<string, Promise<PriceData>>()

  // Backoff for rate limit errors
  private backoffDelay = 1000 // Start with 1 second
  private MAX_BACKOFF = 60000 // Max 60 seconds

  constructor() {
    // Reset request count every minute
    setInterval(() => {
      this.requestCount = 0
      this.requestResetTime = Date.now() + 60000
    }, 60000)
  }

  /**
   * Get prices for token symbols (e.g., 'ethereum', 'solana')
   */
  async getPrices(symbols: string[]): Promise<PriceData> {
    // Check if we're being rate limited
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      console.warn('Rate limit reached, using cached prices')
      return this.getCachedPrices(symbols)
    }

    // Deduplicate - if we already have a pending request for these symbols, return it
    const requestKey = `symbols:${symbols.sort().join(',')}`
    const pending = this.pendingRequests.get(requestKey)
    if (pending) {
      console.log('Returning pending request for symbols:', symbols)
      return pending
    }

    // Create promise for this request
    const promise = new Promise<PriceData>((resolve, reject) => {
      this.requestQueue.push({
        symbols,
        resolve,
        reject,
        timestamp: Date.now(),
      })

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY)
      }
    })

    // Store as pending
    this.pendingRequests.set(requestKey, promise)

    // Clean up pending request when done
    promise.finally(() => {
      this.pendingRequests.delete(requestKey)
    })

    return promise
  }

  /**
   * Get prices for token contracts on a specific platform
   */
  async getTokenPricesByContract(
    platformId: string,
    contractAddresses: string[],
  ): Promise<PriceData> {
    // Check if we're being rate limited
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      console.warn('Rate limit reached, using cached contract prices')
      return this.getCachedContractPrices(platformId, contractAddresses)
    }

    // Deduplicate
    const requestKey = `contracts:${platformId}:${contractAddresses.sort().join(',')}`
    const pending = this.pendingRequests.get(requestKey)
    if (pending) {
      console.log('Returning pending request for contracts:', contractAddresses.length)
      return pending
    }

    // Create promise for this request
    const promise = new Promise<PriceData>((resolve, reject) => {
      this.requestQueue.push({
        contractAddresses: { platform: platformId, addresses: contractAddresses },
        resolve,
        reject,
        timestamp: Date.now(),
      })

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY)
      }
    })

    // Store as pending
    this.pendingRequests.set(requestKey, promise)

    // Clean up when done
    promise.finally(() => {
      this.pendingRequests.delete(requestKey)
    })

    return promise
  }

  /**
   * Process batched requests
   */
  private async processBatch() {
    this.batchTimer = null

    if (this.requestQueue.length === 0) return

    // Take all pending requests
    const requests = [...this.requestQueue]
    this.requestQueue = []

    // Group requests by type
    const symbolRequests = requests.filter((r) => r.symbols)
    const contractRequests = requests.filter((r) => r.contractAddresses)

    // Process symbol requests
    if (symbolRequests.length > 0) {
      await this.processSymbolBatch(symbolRequests)
    }

    // Process contract requests grouped by platform
    const contractsByPlatform = new Map<string, PriceRequest[]>()
    for (const req of contractRequests) {
      if (req.contractAddresses) {
        const platform = req.contractAddresses.platform
        if (!contractsByPlatform.has(platform)) {
          contractsByPlatform.set(platform, [])
        }
        contractsByPlatform.get(platform)!.push(req)
      }
    }

    for (const [platform, reqs] of contractsByPlatform) {
      await this.processContractBatch(platform, reqs)
    }
  }

  /**
   * Process batched symbol price requests
   */
  private async processSymbolBatch(requests: PriceRequest[]) {
    try {
      // Collect all unique symbols
      const allSymbols = new Set<string>()
      for (const req of requests) {
        if (req.symbols) {
          req.symbols.forEach((s) => allSymbols.add(s))
        }
      }

      // Check cache first
      const cachedPrices: PriceData = {}
      const symbolsToFetch: string[] = []

      for (const symbol of allSymbols) {
        const cached = await db.priceData.get(symbol)
        if (cached && Date.now() - cached.lastUpdated < this.HOT_CACHE_DURATION) {
          cachedPrices[symbol] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange,
          }
        } else {
          symbolsToFetch.push(symbol)
        }
      }

      let fetchedPrices: PriceData = {}

      // Fetch missing prices if any
      if (symbolsToFetch.length > 0) {
        // Split into batches if too many symbols
        const batches = []
        for (let i = 0; i < symbolsToFetch.length; i += this.MAX_BATCH_SIZE) {
          batches.push(symbolsToFetch.slice(i, i + this.MAX_BATCH_SIZE))
        }

        for (const batch of batches) {
          try {
            const batchPrices = await this.fetchPricesFromAPI(batch)
            fetchedPrices = { ...fetchedPrices, ...batchPrices }
          } catch (error) {
            console.error('Failed to fetch batch:', error)
            // Try to get stale cached prices as fallback
            for (const symbol of batch) {
              const stale = await db.priceData.get(symbol)
              if (stale) {
                fetchedPrices[symbol] = {
                  usd: stale.usdPrice,
                  usd_24h_change: stale.usd24hChange,
                }
              }
            }
          }
        }
      }

      const allPrices = { ...cachedPrices, ...fetchedPrices }

      // Resolve all requests with their needed data
      for (const req of requests) {
        if (req.symbols) {
          const result: PriceData = {}
          for (const symbol of req.symbols) {
            if (allPrices[symbol]) {
              result[symbol] = allPrices[symbol]
            }
          }
          req.resolve(result)
        }
      }
    } catch (error) {
      console.error('Failed to process symbol batch:', error)
      // Reject all requests
      for (const req of requests) {
        req.reject(error)
      }
    }
  }

  /**
   * Process batched contract price requests
   */
  private async processContractBatch(platform: string, requests: PriceRequest[]) {
    try {
      // Collect all unique addresses
      const allAddresses = new Set<string>()
      for (const req of requests) {
        if (req.contractAddresses) {
          req.contractAddresses.addresses.forEach((a) => allAddresses.add(a))
        }
      }

      // Check cache first
      const cachedPrices: PriceData = {}
      const addressesToFetch: string[] = []

      for (const address of allAddresses) {
        const cacheKey = `${platform}_${address.toLowerCase()}`
        const cached = await db.priceData.get(cacheKey)
        if (cached && Date.now() - cached.lastUpdated < this.HOT_CACHE_DURATION) {
          cachedPrices[address] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange,
          }
        } else {
          addressesToFetch.push(address)
        }
      }

      let fetchedPrices: PriceData = {}

      // Fetch missing prices if any
      if (addressesToFetch.length > 0) {
        // Split into batches if too many addresses
        const batches = []
        for (let i = 0; i < addressesToFetch.length; i += this.MAX_BATCH_SIZE) {
          batches.push(addressesToFetch.slice(i, i + this.MAX_BATCH_SIZE))
        }

        for (const batch of batches) {
          try {
            const batchPrices = await this.fetchContractPricesFromAPI(platform, batch)
            fetchedPrices = { ...fetchedPrices, ...batchPrices }
          } catch (error) {
            console.error('Failed to fetch contract batch:', error)
            // Try stale cache as fallback
            for (const address of batch) {
              const cacheKey = `${platform}_${address.toLowerCase()}`
              const stale = await db.priceData.get(cacheKey)
              if (stale) {
                fetchedPrices[address] = {
                  usd: stale.usdPrice,
                  usd_24h_change: stale.usd24hChange,
                }
              }
            }
          }
        }
      }

      const allPrices = { ...cachedPrices, ...fetchedPrices }

      // Resolve all requests
      for (const req of requests) {
        if (req.contractAddresses) {
          const result: PriceData = {}
          for (const address of req.contractAddresses.addresses) {
            if (allPrices[address]) {
              result[address] = allPrices[address]
            }
          }
          req.resolve(result)
        }
      }
    } catch (error) {
      console.error('Failed to process contract batch:', error)
      // Reject all requests
      for (const req of requests) {
        req.reject(error)
      }
    }
  }

  /**
   * Fetch prices from CoinGecko API with rate limiting and backoff
   */
  private async fetchPricesFromAPI(symbols: string[]): Promise<PriceData> {
    // Check rate limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      await this.waitForRateLimit()
    }

    this.requestCount++

    const isDev = import.meta.env.DEV
    const apiPath = `/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd&include_24hr_change=true`
    const apiUrl = isDev ? `/api/coingecko${apiPath}` : `https://api.coingecko.com${apiPath}`

    try {
      const response = await fetch(apiUrl)

      if (response.status === 429) {
        // Rate limited - apply exponential backoff
        console.warn(`Rate limited. Waiting ${this.backoffDelay}ms before retry`)
        await new Promise((resolve) => setTimeout(resolve, this.backoffDelay))
        this.backoffDelay = Math.min(this.backoffDelay * 2, this.MAX_BACKOFF)
        return this.fetchPricesFromAPI(symbols) // Retry
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`)
      }

      // Reset backoff on success
      this.backoffDelay = 1000

      const data = await response.json()

      // Cache the results
      const now = Date.now()
      for (const [id, priceInfo] of Object.entries(data)) {
        const price = (priceInfo as any).usd || 0
        await db.priceData.put({
          id,
          symbol: id,
          usdPrice: price,
          usd24hChange: (priceInfo as any).usd_24h_change || 0,
          lastUpdated: now,
        })
      }

      return data
    } catch (error) {
      console.error('API fetch error:', error)
      throw error
    }
  }

  /**
   * Fetch contract prices from CoinGecko API
   */
  private async fetchContractPricesFromAPI(
    platform: string,
    addresses: string[],
  ): Promise<PriceData> {
    // Check rate limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      await this.waitForRateLimit()
    }

    this.requestCount++

    const isDev = import.meta.env.DEV
    const apiPath = `/api/v3/simple/token_price/${platform}?contract_addresses=${addresses.join(',')}&vs_currencies=usd&include_24hr_change=true`
    const apiUrl = isDev ? `/api/coingecko${apiPath}` : `https://api.coingecko.com${apiPath}`

    try {
      const response = await fetch(apiUrl)

      if (response.status === 429) {
        // Rate limited - apply exponential backoff
        console.warn(`Rate limited. Waiting ${this.backoffDelay}ms before retry`)
        await new Promise((resolve) => setTimeout(resolve, this.backoffDelay))
        this.backoffDelay = Math.min(this.backoffDelay * 2, this.MAX_BACKOFF)
        return this.fetchContractPricesFromAPI(platform, addresses) // Retry
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch contract prices: ${response.status}`)
      }

      // Reset backoff on success
      this.backoffDelay = 1000

      const data = await response.json()

      // Cache the results
      const now = Date.now()
      for (const [address, priceInfo] of Object.entries(data)) {
        const price = (priceInfo as any).usd || 0
        const cacheKey = `${platform}_${address.toLowerCase()}`
        await db.priceData.put({
          id: cacheKey,
          symbol: cacheKey,
          usdPrice: price,
          usd24hChange: (priceInfo as any).usd_24h_change || 0,
          lastUpdated: now,
        })
      }

      return data
    } catch (error) {
      console.error('Contract price API fetch error:', error)
      throw error
    }
  }

  /**
   * Wait until rate limit resets
   */
  private async waitForRateLimit() {
    const waitTime = Math.max(0, this.requestResetTime - Date.now())
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms for rate limit reset`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  /**
   * Get cached prices for symbols (including stale cache)
   */
  private async getCachedPrices(symbols: string[]): Promise<PriceData> {
    const result: PriceData = {}

    for (const symbol of symbols) {
      const cached = await db.priceData.get(symbol)
      if (cached) {
        // Use even stale cache when rate limited
        result[symbol] = {
          usd: cached.usdPrice,
          usd_24h_change: cached.usd24hChange,
        }
      }
    }

    return result
  }

  /**
   * Get cached contract prices (including stale cache)
   */
  private async getCachedContractPrices(platform: string, addresses: string[]): Promise<PriceData> {
    const result: PriceData = {}

    for (const address of addresses) {
      const cacheKey = `${platform}_${address.toLowerCase()}`
      const cached = await db.priceData.get(cacheKey)
      if (cached) {
        result[address] = {
          usd: cached.usdPrice,
          usd_24h_change: cached.usd24hChange,
        }
      }
    }

    return result
  }

  /**
   * Clear old cache entries to prevent database bloat
   */
  async cleanupCache() {
    const now = Date.now()
    const coldCacheCutoff = now - this.COLD_CACHE_DURATION

    // Delete prices older than 24 hours
    const allPrices = await db.priceData.toArray()
    const toDelete = allPrices.filter((p) => p.lastUpdated < coldCacheCutoff).map((p) => p.id)

    if (toDelete.length > 0) {
      await db.priceData.bulkDelete(toDelete)
      console.log(`Cleaned up ${toDelete.length} old price cache entries`)
    }
  }
}

// Export singleton instance
export const priceService = new PriceService()

// Run cleanup every hour
setInterval(
  () => {
    priceService.cleanupCache()
  },
  60 * 60 * 1000,
)
