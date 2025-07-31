import { Alchemy, Network as AlchemyNetwork, TokenBalancesResponse } from 'alchemy-sdk'
import { Network } from '../../types'
import { db } from '../storage/database'

interface AlchemyConfig {
  apiKey: string
  network: AlchemyNetwork
}

export class AlchemyService {
  private static instances: Map<string, AlchemyService> = new Map()
  private alchemy: Alchemy
  private network: Network
  
  private constructor(network: Network) {
    this.network = network
    
    // Extract API key from Alchemy URL
    const apiKey = this.extractApiKey(network.alchemyRpcUrl!)
    const alchemyNetwork = this.getAlchemyNetwork(network.chainId)
    
    if (!apiKey || !alchemyNetwork) {
      throw new Error(`Invalid Alchemy configuration for network ${network.name}`)
    }
    
    this.alchemy = new Alchemy({
      apiKey,
      network: alchemyNetwork
    })
  }
  
  static getInstance(network: Network): AlchemyService | null {
    if (!network.alchemyRpcUrl) {
      return null
    }
    
    const key = `${network.id}_${network.chainId}`
    let instance = AlchemyService.instances.get(key)
    
    if (!instance) {
      try {
        instance = new AlchemyService(network)
        AlchemyService.instances.set(key, instance)
      } catch (error) {
        console.warn(`Failed to create Alchemy service for ${network.name}:`, error)
        return null
      }
    }
    
    return instance
  }
  
  /**
   * Extract API key from Alchemy RPC URL
   */
  private extractApiKey(url: string): string | null {
    const match = url.match(/\/v2\/([^/]+)$/)
    return match ? match[1] : null
  }
  
  /**
   * Map chainId to Alchemy network enum
   */
  private getAlchemyNetwork(chainId: number | string): AlchemyNetwork | null {
    // Handle string chainIds for Solana
    if (typeof chainId === 'string') {
      const solanaNetworkMap: Record<string, AlchemyNetwork> = {
        'mainnet-beta': AlchemyNetwork.SOL_MAINNET,
        'devnet': AlchemyNetwork.SOL_DEVNET,
      }
      return solanaNetworkMap[chainId] || null
    }
    
    // Handle numeric chainIds for EVM chains
    const networkMap: Record<number, AlchemyNetwork> = {
      1: AlchemyNetwork.ETH_MAINNET,
      137: AlchemyNetwork.MATIC_MAINNET,
      10: AlchemyNetwork.OPT_MAINNET,
      42161: AlchemyNetwork.ARB_MAINNET,
      8453: AlchemyNetwork.BASE_MAINNET,
      56: AlchemyNetwork.BNB_MAINNET, // BNB Smart Chain
    }
    
    return networkMap[chainId] || null
  }
  
  /**
   * Get token balances using Alchemy SDK
   * This is much more efficient than checking each token individually
   * Note: This currently only works for EVM chains. Solana support would need different implementation.
   */
  async getTokenBalances(walletAddress: string): Promise<TokenBalancesResponse> {
    try {
      console.debug(`Fetching token balances via Alchemy for ${walletAddress} on ${this.network.name}`)
      
      // For Solana, we would need to use different Alchemy methods
      if (this.network.type === 'SVM') {
        throw new Error('Solana token fetching via Alchemy not yet implemented')
      }
      
      // Get token balances from Alchemy (EVM only)
      const balances = await this.alchemy.core.getTokenBalances(walletAddress)
      
      console.debug(`Alchemy returned ${balances.tokenBalances.length} tokens`)
      
      return balances
    } catch (error: any) {
      // Check for rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        console.warn('Alchemy rate limit hit, will fallback to regular RPC')
        throw new Error('RATE_LIMIT')
      }
      
      console.error('Alchemy getTokenBalances error:', error)
      throw error
    }
  }
  
  /**
   * Get token metadata (name, symbol, decimals) for multiple tokens
   */
  async getTokenMetadata(tokenAddresses: string[]) {
    try {
      const metadata = await Promise.all(
        tokenAddresses.map(address => 
          this.alchemy.core.getTokenMetadata(address)
        )
      )
      
      return metadata
    } catch (error) {
      console.error('Alchemy getTokenMetadata error:', error)
      throw error
    }
  }
  
  /**
   * Check if we should use Alchemy based on rate limiting
   */
  async canUseAlchemy(): Promise<boolean> {
    // Check if we've been rate limited recently
    const rateLimitKey = `alchemy_rate_limit_${this.network.id}`
    const lastRateLimit = localStorage.getItem(rateLimitKey)
    
    if (lastRateLimit) {
      const timeSinceLimit = Date.now() - parseInt(lastRateLimit)
      // Wait 60 seconds after rate limit before trying again
      if (timeSinceLimit < 60000) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Mark that we've been rate limited
   */
  markRateLimited(): void {
    const rateLimitKey = `alchemy_rate_limit_${this.network.id}`
    localStorage.setItem(rateLimitKey, Date.now().toString())
  }
}