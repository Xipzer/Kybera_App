/**
 * Automatic Token Discovery Service
 * Discovers tokens owned by wallets using Alchemy API
 */

import { ethers } from 'ethers'
import { Network } from '../../types'
import { db } from '../storage/database'
import { AlchemyService } from './alchemyService'
import { EVMRpcService } from './evmRpcService'

interface DiscoveredToken {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
}

export class TokenDiscoveryService {
  private network: Network
  private chainId: number
  private alchemyService: AlchemyService | null
  private rpcService: EVMRpcService | null

  constructor(network: Network) {
    this.network = network
    this.chainId = typeof network.chainId === 'number' ? network.chainId : 1

    // Try to get Alchemy service if available
    this.alchemyService = AlchemyService.getInstance(network)

    // Fallback RPC service for token metadata
    this.rpcService = network.type === 'EVM' ? new EVMRpcService(network.rpcUrl) : null
  }

  /**
   * Discover all tokens for a wallet address
   * Returns newly discovered tokens that weren't already tracked
   */
  async discoverTokens(walletAddress: string): Promise<DiscoveredToken[]> {
    if (!this.alchemyService) {
      console.log(`[TokenDiscovery] No Alchemy service available for ${this.network.name}`)
      return []
    }

    try {
      // Check if we can use Alchemy (rate limiting check)
      const canUse = await this.alchemyService.canUseAlchemy()
      if (!canUse) {
        console.log(`[TokenDiscovery] Alchemy rate limited for ${this.network.name}`)
        return []
      }

      console.log(
        `[TokenDiscovery] Starting token discovery for ${walletAddress} on ${this.network.name}`,
      )

      // Get all token balances from Alchemy
      const tokenBalances = await this.alchemyService.getTokenBalances(walletAddress)

      if (!tokenBalances || !tokenBalances.tokenBalances) {
        console.log(`[TokenDiscovery] No tokens found`)
        return []
      }

      console.log(`[TokenDiscovery] Found ${tokenBalances.tokenBalances.length} potential tokens`)

      // Get existing discovered tokens to avoid duplicates
      const existingTokens = await this.getExistingTokens(walletAddress)
      const existingAddresses = new Set(existingTokens.map((t) => t.toLowerCase()))

      const newTokens: DiscoveredToken[] = []
      const metadataPromises: Promise<void>[] = []

      // Process each token
      for (const tokenBalance of tokenBalances.tokenBalances) {
        const tokenAddress = tokenBalance.contractAddress.toLowerCase()

        // Skip if already discovered
        if (existingAddresses.has(tokenAddress)) {
          continue
        }

        // Skip if balance is zero or null
        if (!tokenBalance.tokenBalance || tokenBalance.tokenBalance === '0x0') {
          continue
        }

        // Get token metadata
        metadataPromises.push(
          this.processToken(walletAddress, tokenAddress, tokenBalance.tokenBalance, newTokens),
        )
      }

      // Wait for all metadata fetches
      await Promise.all(metadataPromises)

      console.log(`[TokenDiscovery] Discovered ${newTokens.length} new tokens with balance`)

      return newTokens
    } catch (error: any) {
      // Handle rate limiting
      if (error.message === 'RATE_LIMIT') {
        this.alchemyService.markRateLimited()
        console.warn(`[TokenDiscovery] Rate limited by Alchemy`)
      } else {
        console.error(`[TokenDiscovery] Error discovering tokens:`, error)
      }

      return []
    }
  }

  /**
   * Process a single token - fetch metadata and add to database
   */
  private async processToken(
    walletAddress: string,
    tokenAddress: string,
    balanceHex: string,
    newTokens: DiscoveredToken[],
  ): Promise<void> {
    try {
      // Try to get metadata from Alchemy first
      let symbol = 'UNKNOWN'
      let name = 'Unknown Token'
      let decimals = 18

      if (this.alchemyService) {
        try {
          const metadata = await this.alchemyService.getTokenMetadata([tokenAddress])
          if (metadata && metadata[0]) {
            symbol = metadata[0].symbol || 'UNKNOWN'
            name = metadata[0].name || 'Unknown Token'
            decimals = metadata[0].decimals || 18
          }
        } catch (metadataError) {
          console.debug(`[TokenDiscovery] Failed to get Alchemy metadata for ${tokenAddress}`)
        }
      }

      // Fallback to RPC if we didn't get metadata
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
        } catch (rpcError) {
          console.debug(`[TokenDiscovery] Failed to get RPC metadata for ${tokenAddress}`)
        }
      }

      // Convert balance from hex to readable format
      const balance = ethers.formatUnits(BigInt(balanceHex), decimals)

      // Skip if balance is effectively zero (less than 0.000001)
      const balanceNum = parseFloat(balance)
      if (balanceNum < 0.000001) {
        return
      }

      // Add to discovered tokens database
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

      // Add to new tokens array for return
      newTokens.push({
        address: tokenAddress,
        symbol,
        name,
        decimals,
        balance,
      })

      console.log(`[TokenDiscovery] Discovered ${symbol} (${name}) with balance ${balance}`)
    } catch (error) {
      console.error(`[TokenDiscovery] Error processing token ${tokenAddress}:`, error)
    }
  }

  /**
   * Get existing discovered tokens for a wallet
   */
  private async getExistingTokens(walletAddress: string): Promise<string[]> {
    try {
      const discovered = await db.discoveredTokens
        .where('walletAddress')
        .equals(walletAddress)
        .and((item) => item.chainId === this.chainId)
        .toArray()

      return discovered.map((t) => t.tokenAddress.toLowerCase())
    } catch (error) {
      console.error(`[TokenDiscovery] Error getting existing tokens:`, error)
      return []
    }
  }

  /**
   * Check if token discovery is available for this network
   */
  isAvailable(): boolean {
    return this.alchemyService !== null
  }
}
