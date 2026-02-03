/**
 * Token Discovery Service
 * Discovers tokens owned by wallets using Alchemy API
 */

import { ethers } from 'ethers'
import { Network } from '../../types'
import { db } from '../storage/database'
import { AlchemyService } from './alchemyService'
import { EVMRpcService } from './evmRpcService'
import { blockchainEventBus } from './core/eventBus'
import { getBestRpcUrl } from './provider'

interface DiscoveredToken {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
}

// Known scam/spam token patterns - only match obvious scams
// Avoid patterns like .com/.xyz/.io as they catch legitimate tokens
const SPAM_PATTERNS = [
  /airdrop/i,
  /claim\s+your/i, // "claim your" but not "reclaim" etc
  /visit\s+\w+\.\w+/i, // "visit website.com"
  /free\s+(token|money|crypto)/i,
  /bonus\s+(token|reward)/i,
  /\.com\s*$/i, // Token name ending in .com
  /\.xyz\s*$/i, // Token name ending in .xyz
  /http[s]?:\/\//i, // URLs in token names
]

// Cooldown period between discovery runs for same wallet (5 minutes)
const DISCOVERY_COOLDOWN_MS = 5 * 60 * 1000
// Max entries to keep in the map to prevent unbounded growth
const MAX_COOLDOWN_ENTRIES = 100
// Track last discovery time per wallet+chain
const lastDiscoveryTime = new Map<string, number>()

/** Clean up stale entries from the cooldown map */
function cleanupStaleCooldowns(): void {
  if (lastDiscoveryTime.size <= MAX_COOLDOWN_ENTRIES) return
  
  const cutoff = Date.now() - DISCOVERY_COOLDOWN_MS * 2
  for (const [key, time] of lastDiscoveryTime) {
    if (time < cutoff) lastDiscoveryTime.delete(key)
  }
  
  // If still too many, remove oldest entries
  if (lastDiscoveryTime.size > MAX_COOLDOWN_ENTRIES) {
    const entries = [...lastDiscoveryTime.entries()].sort((a, b) => a[1] - b[1])
    const toRemove = entries.slice(0, entries.length - MAX_COOLDOWN_ENTRIES)
    toRemove.forEach(([key]) => lastDiscoveryTime.delete(key))
  }
}

export class TokenDiscoveryService {
  private network: Network
  private chainId: number
  private alchemyService: AlchemyService | null
  private rpcService: EVMRpcService | null

  constructor(network: Network) {
    this.network = network
    this.chainId = typeof network.chainId === 'number' ? network.chainId : 1
    this.alchemyService = AlchemyService.getInstance(network)
    this.rpcService = network.type === 'EVM' ? new EVMRpcService(getBestRpcUrl(network)) : null
  }

  /**
   * Discover tokens for a wallet address
   * Filters out spam/scam tokens and low-value dust
   * Has a cooldown to prevent running too frequently
   */
  async discoverTokens(walletAddress: string, force = false): Promise<DiscoveredToken[]> {
    if (!this.alchemyService) return []

    // Cleanup stale cooldown entries periodically
    cleanupStaleCooldowns()

    // Check cooldown (skip if forced)
    const cacheKey = `${walletAddress}_${this.chainId}`
    const now = Date.now()

    if (!force && now - (lastDiscoveryTime.get(cacheKey) || 0) < DISCOVERY_COOLDOWN_MS) {
      console.log(`[TokenDiscovery] Skipping ${this.network.name} - cooldown active`)
      return []
    }

    lastDiscoveryTime.set(cacheKey, now)

    try {
      console.log(
        `[TokenDiscovery] Starting discovery for ${walletAddress} on ${this.network.name}`,
      )

      const tokenBalances = await this.alchemyService.getTokenBalances(walletAddress)
      if (!tokenBalances?.tokenBalances?.length) {
        return []
      }

      console.log(`[TokenDiscovery] Found ${tokenBalances.tokenBalances.length} potential tokens`)

      // Get existing tokens to avoid duplicates
      const existingAddresses = new Set(
        (await this.getExistingTokens(walletAddress)).map((t) => t.toLowerCase()),
      )

      // Filter to tokens that need processing
      type TokenBalanceEntry = { contractAddress: string; tokenBalance: string }
      const tokensToProcess = (tokenBalances.tokenBalances as TokenBalanceEntry[]).filter((tb) => {
        const tokenAddress = tb.contractAddress.toLowerCase()
        // Skip existing or zero balance
        return !existingAddresses.has(tokenAddress) && tb.tokenBalance && tb.tokenBalance !== '0x0'
      })

      // Process tokens in parallel batches (5 at a time to avoid rate limits)
      const BATCH_SIZE = 5
      const newTokens: DiscoveredToken[] = []

      for (let i = 0; i < tokensToProcess.length; i += BATCH_SIZE) {
        const batch = tokensToProcess.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(
          batch.map((tb: TokenBalanceEntry) =>
            this.processToken(walletAddress, tb.contractAddress.toLowerCase(), tb.tokenBalance),
          ),
        )
        for (const token of results) {
          if (token) newTokens.push(token)
        }
      }

      console.log(`[TokenDiscovery] Discovered ${newTokens.length} valid new tokens`)

      // Emit event if we found new tokens so UI can refresh
      if (newTokens.length > 0) {
        blockchainEventBus.emit('token:discovery:complete', {
          wallet: walletAddress,
          chainId: this.chainId,
          count: newTokens.length,
        })
      }

      return newTokens
    } catch (error) {
      console.error(`[TokenDiscovery] Error:`, error)
      return []
    }
  }

  /**
   * Process a single token - validates and filters spam
   */
  private async processToken(
    walletAddress: string,
    tokenAddress: string,
    balanceHex: string,
  ): Promise<DiscoveredToken | null> {
    try {
      // Get metadata
      let symbol = 'UNKNOWN'
      let name = 'Unknown Token'
      let decimals = 18

      if (this.alchemyService) {
        try {
          const metadata = await this.alchemyService.getTokenMetadata([tokenAddress])
          if (metadata?.[0]) {
            symbol = metadata[0].symbol || 'UNKNOWN'
            name = metadata[0].name || 'Unknown Token'
            decimals = metadata[0].decimals || 18
          }
        } catch {
          // Fallback to RPC
        }
      }

      // Fallback to RPC
      if (symbol === 'UNKNOWN' && this.rpcService) {
        try {
          const [rpcSymbol, rpcName, rpcDecimals] = await Promise.all([
            this.rpcService.getTokenSymbol(tokenAddress),
            this.rpcService.getTokenName(tokenAddress),
            this.rpcService.getTokenDecimals(tokenAddress),
          ])
          symbol = rpcSymbol || symbol
          name = rpcName || name
          decimals = rpcDecimals || decimals
        } catch {
          // Keep defaults
        }
      }

      // Filter spam tokens by name/symbol
      if (this.isSpamToken(name, symbol)) {
        console.log(`[TokenDiscovery] Filtered spam token: ${symbol} (${name})`)
        return null
      }

      // Convert balance
      const balance = ethers.formatUnits(BigInt(balanceHex), decimals)
      const balanceNum = parseFloat(balance)

      // Skip dust (< 0.000001)
      if (balanceNum < 0.000001) {
        return null
      }

      // Save to database
      const id = `${walletAddress}_${this.chainId}_${tokenAddress}`
      await db.discoveredTokens.put({
        id,
        walletAddress,
        chainId: this.chainId,
        tokenAddress,
        name,
        symbol,
        decimals,
        addedManually: false,
        discoveredAt: Date.now(),
      })

      console.log(`[TokenDiscovery] Discovered ${symbol}: ${balance}`)

      return { address: tokenAddress, symbol, name, decimals, balance }
    } catch (error) {
      console.error(`[TokenDiscovery] Error processing ${tokenAddress}:`, error)
      return null
    }
  }

  /**
   * Check if token name/symbol matches spam patterns
   */
  private isSpamToken(name: string, symbol: string): boolean {
    const combined = `${name} ${symbol}`
    return SPAM_PATTERNS.some((pattern) => pattern.test(combined))
  }

  /**
   * Get existing discovered tokens for a wallet on this chain
   */
  private async getExistingTokens(walletAddress: string): Promise<string[]> {
    try {
      const discovered = await db.discoveredTokens
        .where('walletAddress')
        .equals(walletAddress)
        .and((item) => item.chainId === this.chainId)
        .toArray()
      return discovered.map((t) => t.tokenAddress)
    } catch {
      return []
    }
  }

  /**
   * Check if discovery is available for this network
   */
  isAvailable(): boolean {
    return this.alchemyService !== null
  }
}
