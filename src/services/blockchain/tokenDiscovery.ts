/**
 * Code by Xipzer
 */

import { ethers } from 'ethers'
import { Network } from '../../types'
import { db } from '../database'
import { AlchemyService } from './alchemyService'
import { EVMRpcService } from './evmRpcService'
import { blockchainEventBus } from './eventBus'
import { getBestRpcUrl } from './provider'

interface DiscoveredToken {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
}

const SPAM_PATTERNS = [
  /airdrop/i,
  /claim\s+your/i,
  /visit\s+\w+\.\w+/i,
  /free\s+(token|money|crypto)/i,
  /bonus\s+(token|reward)/i,
  /\.com\s*$/i,
  /\.xyz\s*$/i,
  /http[s]?:\/\//i,
]

const DISCOVERY_COOLDOWN_MS = 5 * 60 * 1000
const MAX_COOLDOWN_ENTRIES = 100
const lastDiscoveryTime = new Map<string, number>()

function cleanupStaleCooldowns(): void {
  if (lastDiscoveryTime.size <= MAX_COOLDOWN_ENTRIES) return
  
  const cutoff = Date.now() - DISCOVERY_COOLDOWN_MS * 2
  for (const [key, time] of lastDiscoveryTime) {
    if (time < cutoff) lastDiscoveryTime.delete(key)
  }
  
  if (lastDiscoveryTime.size > MAX_COOLDOWN_ENTRIES) {
    const entries = [...lastDiscoveryTime.entries()].sort((a, b) => a[1] - b[1])
    entries
      .slice(0, entries.length - MAX_COOLDOWN_ENTRIES)
      .forEach(([key]) => lastDiscoveryTime.delete(key))
  }
}

export class TokenDiscoveryService {
  private chainId: number
  private network: Network
  private rpcService: EVMRpcService | null

  constructor(network: Network) {
    this.chainId = typeof network.chainId === 'number' ? network.chainId : 1
    this.network = network
    this.rpcService = network.type === 'EVM' ? new EVMRpcService(getBestRpcUrl(network)) : null
  }

  async discoverTokens(walletAddress: string, force = false): Promise<DiscoveredToken[]> {
    const alchemyService = AlchemyService.getInstance(this.network)
    if (!alchemyService) return []

    cleanupStaleCooldowns()

    const cacheKey = `${walletAddress}_${this.chainId}`
    const now = Date.now()

    if (!force && now - (lastDiscoveryTime.get(cacheKey) || 0) < DISCOVERY_COOLDOWN_MS) {
      return []
    }

    lastDiscoveryTime.set(cacheKey, now)

    try {
      const tokenBalances = await alchemyService.getTokenBalances(walletAddress)
      if (!tokenBalances?.tokenBalances?.length) {
        return []
      }

      const existingAddresses = new Set(
        (await this.getExistingTokens(walletAddress)).map((t) => t.toLowerCase()),
      )

      type TokenBalanceEntry = { contractAddress: string; tokenBalance: string }
      const tokensToProcess = (tokenBalances.tokenBalances as TokenBalanceEntry[]).filter((tb) => {
        const tokenAddress = tb.contractAddress.toLowerCase()
        return !existingAddresses.has(tokenAddress) && tb.tokenBalance && tb.tokenBalance !== '0x0'
      })

      const BATCH_SIZE = 5
      const newTokens: DiscoveredToken[] = []

      for (let i = 0; i < tokensToProcess.length; i += BATCH_SIZE) {
        const results = await Promise.all(
          tokensToProcess
            .slice(i, i + BATCH_SIZE)
            .map((tb: TokenBalanceEntry) =>
              this.processToken(
                alchemyService,
                walletAddress,
                tb.contractAddress.toLowerCase(),
                tb.tokenBalance,
              ),
            ),
        )
        for (const token of results) {
          if (token) newTokens.push(token)
        }
      }

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

  private async processToken(
    alchemy: AlchemyService,
    walletAddress: string,
    tokenAddress: string,
    balanceHex: string,
  ): Promise<DiscoveredToken | null> {
    try {
      let symbol = 'UNKNOWN'
      let name = 'Unknown Token'
      let decimals = 18

      try {
        const metadata = await alchemy.getTokenMetadata([tokenAddress])
        if (metadata?.[0]) {
          symbol = metadata[0].symbol || 'UNKNOWN'
          name = metadata[0].name || 'Unknown Token'
          decimals = metadata[0].decimals || 18
        }
      } catch {
        /* metadata lookup is best-effort; fall back to RPC below */
      }

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
          /* RPC metadata fallback failed; keep defaults */
        }
      }

      if (this.isSpamToken(name, symbol)) {
        return null
      }

      const balance = ethers.formatUnits(BigInt(balanceHex), decimals)

      if (parseFloat(balance) < 0.000001) {
        return null
      }

      await db.discoveredTokens.put({
        id: `${walletAddress}_${this.chainId}_${tokenAddress}`,
        walletAddress,
        chainId: this.chainId,
        tokenAddress,
        name,
        symbol,
        decimals,
        addedManually: false,
        discoveredAt: Date.now(),
      })

      return { address: tokenAddress, symbol, name, decimals, balance }
    } catch (error) {
      console.error(`[TokenDiscovery] Error processing ${tokenAddress}:`, error)
      return null
    }
  }

  private isSpamToken(name: string, symbol: string): boolean {
    return SPAM_PATTERNS.some((pattern) => pattern.test(`${name} ${symbol}`))
  }

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

  isAvailable(): boolean {
    return AlchemyService.getInstance(this.network) !== null
  }
}