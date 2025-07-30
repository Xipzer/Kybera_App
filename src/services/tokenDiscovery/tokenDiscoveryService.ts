import { TokenInfo, TokenDiscoveryProvider } from './types'
import { AlchemyTokenDiscoveryProvider } from './providers/alchemyProvider'
import { MoralisTokenDiscoveryProvider } from './providers/moralisProvider'
import { CovalentTokenDiscoveryProvider } from './providers/covalentProvider'
import { EtherscanTokenDiscoveryProvider } from './providers/etherscanProvider'
import { TokenListProvider } from './providers/tokenListProvider'
import { SolanaTokenDiscoveryProvider } from './providers/solanaProvider'
import { db } from '../storage/database'

export interface TokenDiscoveryConfig {
  alchemyApiKey?: string
  moralisApiKey?: string
  covalentApiKey?: string
  etherscanApiKeys?: Record<number, string>
  enabledProviders?: string[]
}

export class TokenDiscoveryService {
  private providers: TokenDiscoveryProvider[] = []
  private discoveredTokensCache = new Map<string, TokenInfo[]>()
  private lastDiscovery = new Map<string, number>()
  private DISCOVERY_CACHE_DURATION = 300000 // 5 minutes
  
  constructor(config?: TokenDiscoveryConfig) {
    this.initializeProviders(config)
  }
  
  private initializeProviders(config?: TokenDiscoveryConfig) {
    const enabledProviders = config?.enabledProviders || ['tokenlist', 'solana']
    
    // Initialize providers based on config
    if (enabledProviders.includes('alchemy') && config?.alchemyApiKey) {
      this.providers.push(new AlchemyTokenDiscoveryProvider())
    }
    
    if (enabledProviders.includes('moralis') && config?.moralisApiKey) {
      this.providers.push(new MoralisTokenDiscoveryProvider())
    }
    
    if (enabledProviders.includes('covalent') && config?.covalentApiKey) {
      this.providers.push(new CovalentTokenDiscoveryProvider())
    }
    
    if (enabledProviders.includes('etherscan') && config?.etherscanApiKeys) {
      this.providers.push(new EtherscanTokenDiscoveryProvider())
    }
    
    if (enabledProviders.includes('tokenlist')) {
      this.providers.push(new TokenListProvider())
    }
    
    if (enabledProviders.includes('solana')) {
      this.providers.push(new SolanaTokenDiscoveryProvider())
    }
  }
  
  async discoverTokens(
    walletAddress: string,
    chainId: string | number,
    forceRefresh = false
  ): Promise<TokenInfo[]> {
    const cacheKey = `${walletAddress}_${chainId}`
    
    // Check cache first
    if (!forceRefresh) {
      const cached = this.discoveredTokensCache.get(cacheKey)
      const lastTime = this.lastDiscovery.get(cacheKey) || 0
      
      if (cached && Date.now() - lastTime < this.DISCOVERY_CACHE_DURATION) {
        return cached
      }
    }
    
    // Check persisted discovered tokens
    const persistedTokens = await this.getPersistedTokens(walletAddress, chainId)
    if (persistedTokens.length > 0 && !forceRefresh) {
      return persistedTokens
    }
    
    // Discover tokens from providers
    const discoveredTokens = new Map<string, TokenInfo>()
    
    for (const provider of this.providers) {
      try {
        const tokens = await provider.discoverTokens(walletAddress, chainId)
        
        // Merge tokens, avoiding duplicates
        for (const token of tokens) {
          const key = token.address.toLowerCase()
          if (!discoveredTokens.has(key)) {
            discoveredTokens.set(key, token)
          }
        }
      } catch (error) {
        console.error(`Token discovery failed for provider ${provider.name}:`, error)
      }
    }
    
    const tokens = Array.from(discoveredTokens.values())
    
    // Cache results
    this.discoveredTokensCache.set(cacheKey, tokens)
    this.lastDiscovery.set(cacheKey, Date.now())
    
    // Persist discovered tokens
    await this.persistTokens(walletAddress, chainId, tokens)
    
    return tokens
  }
  
  async addCustomToken(
    walletAddress: string,
    chainId: string | number,
    tokenInfo: TokenInfo
  ): Promise<void> {
    const id = `${walletAddress}_${chainId}_${tokenInfo.address.toLowerCase()}`
    
    await db.discoveredTokens.put({
      id,
      walletAddress,
      chainId: chainId.toString(),
      tokenAddress: tokenInfo.address,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      logoURI: tokenInfo.logoURI,
      tags: tokenInfo.tags,
      addedManually: true,
      discoveredAt: Date.now(),
      lastSeen: Date.now()
    })
    
    // Clear cache to force refresh
    const cacheKey = `${walletAddress}_${chainId}`
    this.discoveredTokensCache.delete(cacheKey)
  }
  
  async removeToken(
    walletAddress: string,
    chainId: string | number,
    tokenAddress: string
  ): Promise<void> {
    const id = `${walletAddress}_${chainId}_${tokenAddress.toLowerCase()}`
    await db.discoveredTokens.delete(id)
    
    // Clear cache
    const cacheKey = `${walletAddress}_${chainId}`
    this.discoveredTokensCache.delete(cacheKey)
  }
  
  private async persistTokens(
    walletAddress: string,
    chainId: string | number,
    tokens: TokenInfo[]
  ): Promise<void> {
    const now = Date.now()
    
    for (const token of tokens) {
      const id = `${walletAddress}_${chainId}_${token.address.toLowerCase()}`
      
      // Check if already exists
      const existing = await db.discoveredTokens.get(id)
      
      if (!existing || !existing.addedManually) {
        await db.discoveredTokens.put({
          id,
          walletAddress,
          chainId: chainId.toString(),
          tokenAddress: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          tags: token.tags,
          addedManually: false,
          discoveredAt: existing?.discoveredAt || now,
          lastSeen: now
        })
      }
    }
    
    // Clean up tokens not seen in a while (30 days)
    const cutoffTime = now - (30 * 24 * 60 * 60 * 1000)
    await db.discoveredTokens
      .where('walletAddress')
      .equals(walletAddress)
      .and(item => 
        item.chainId === chainId.toString() && 
        item.lastSeen < cutoffTime && 
        !item.addedManually
      )
      .delete()
  }
  
  private async getPersistedTokens(
    walletAddress: string,
    chainId: string | number
  ): Promise<TokenInfo[]> {
    const tokens = await db.discoveredTokens
      .where('walletAddress')
      .equals(walletAddress)
      .and(item => item.chainId === chainId.toString())
      .toArray()
    
    return tokens.map(token => ({
      address: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      chainId: chainId,
      tags: token.tags
    }))
  }
  
  // Get token metadata from various sources
  async getTokenMetadata(
    tokenAddress: string,
    chainId: string | number
  ): Promise<TokenInfo | null> {
    // Check cache first
    for (const [, tokens] of this.discoveredTokensCache) {
      const token = tokens.find(t => 
        t.address.toLowerCase() === tokenAddress.toLowerCase() &&
        t.chainId === chainId
      )
      if (token) return token
    }
    
    // Check persisted tokens
    const persistedTokens = await db.discoveredTokens
      .where('tokenAddress')
      .equals(tokenAddress)
      .and(item => item.chainId === chainId.toString())
      .first()
    
    if (persistedTokens) {
      return {
        address: persistedTokens.tokenAddress,
        symbol: persistedTokens.symbol,
        name: persistedTokens.name,
        decimals: persistedTokens.decimals,
        logoURI: persistedTokens.logoURI,
        chainId: chainId,
        tags: persistedTokens.tags
      }
    }
    
    return null
  }
}

// Create a singleton instance
export const tokenDiscoveryService = new TokenDiscoveryService()